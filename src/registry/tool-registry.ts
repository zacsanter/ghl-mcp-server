/**
 * Tool Registry
 * Central registry that manages tool visibility (enable/disable) by category.
 * Sends `tools/list_changed` notifications when tools are enabled or disabled.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

interface RegisteredToolEntry {
  definition: Tool;
  category: string;
  enabled: boolean;
  executor: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
}

interface CategoryInfo {
  key: string;
  description: string;
  enabled: boolean;
  toolCount: number;
  toolNames: string[];
}

interface ToolSearchResult {
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

export class ToolRegistry {
  private tools: Map<string, RegisteredToolEntry> = new Map();
  private categories: Map<string, { description: string; enabled: boolean }> = new Map();
  private server: Server;

  constructor(server: Server) {
    this.server = server;
  }

  /**
   * Register all tools from a module under a category. All start disabled.
   */
  registerCategory(
    key: string,
    description: string,
    toolDefinitions: Tool[],
    executor: (toolName: string, args: Record<string, unknown>) => Promise<unknown>
  ): void {
    this.categories.set(key, { description, enabled: false });

    for (const def of toolDefinitions) {
      if (this.tools.has(def.name)) {
        process.stderr.write(`[ToolRegistry] Warning: duplicate tool name "${def.name}" in category "${key}" (already registered)\n`);
      }
      this.tools.set(def.name, {
        definition: def,
        category: key,
        enabled: false,
        executor,
      });
    }
  }

  /**
   * Enable a category — makes its tools visible to Claude.
   */
  enableCategory(category: string): { enabled: string[]; count: number } {
    const cat = this.categories.get(category);
    if (!cat) {
      throw new Error(`Unknown category: "${category}". Use list_categories to see available categories.`);
    }

    if (cat.enabled) {
      const names = this.getToolNamesForCategory(category);
      return { enabled: names, count: names.length };
    }

    cat.enabled = true;
    const enabledNames: string[] = [];

    for (const [name, entry] of this.tools) {
      if (entry.category === category) {
        entry.enabled = true;
        enabledNames.push(name);
      }
    }

    this.notifyToolsChanged();
    return { enabled: enabledNames, count: enabledNames.length };
  }

  /**
   * Disable a category — hides its tools from Claude.
   */
  disableCategory(category: string): { disabled: string[]; count: number } {
    const cat = this.categories.get(category);
    if (!cat) {
      throw new Error(`Unknown category: "${category}". Use list_categories to see available categories.`);
    }

    if (!cat.enabled) {
      const names = this.getToolNamesForCategory(category);
      return { disabled: names, count: names.length };
    }

    cat.enabled = false;
    const disabledNames: string[] = [];

    for (const [name, entry] of this.tools) {
      if (entry.category === category) {
        entry.enabled = false;
        disabledNames.push(name);
      }
    }

    this.notifyToolsChanged();
    return { disabled: disabledNames, count: disabledNames.length };
  }

  /**
   * Enable all categories at once.
   */
  enableAll(): { totalEnabled: number; categories: string[] } {
    const enabledCategories: string[] = [];
    let totalEnabled = 0;

    for (const [key, cat] of this.categories) {
      if (!cat.enabled) {
        cat.enabled = true;
        enabledCategories.push(key);
      }
    }

    for (const [, entry] of this.tools) {
      entry.enabled = true;
      totalEnabled++;
    }

    if (enabledCategories.length > 0) {
      this.notifyToolsChanged();
    }

    return { totalEnabled, categories: enabledCategories };
  }

  /**
   * Get all enabled tool definitions (for ListToolsRequestSchema).
   */
  getEnabledTools(): Tool[] {
    const tools: Tool[] = [];
    for (const [, entry] of this.tools) {
      if (entry.enabled) {
        tools.push(entry.definition);
      }
    }
    return tools;
  }

  /**
   * Execute a tool by name. Returns helpful error if tool exists but is disabled.
   */
  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const entry = this.tools.get(name);
    if (!entry) {
      throw new Error(`Unknown tool: "${name}"`);
    }

    if (!entry.enabled) {
      throw new Error(
        `Tool "${name}" belongs to the "${entry.category}" category which is not currently enabled. ` +
        `Call enable_category with category "${entry.category}" to enable it.`
      );
    }

    return entry.executor(name, args);
  }

  /**
   * Check if a tool exists (enabled or disabled).
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Check if a tool is currently enabled.
   */
  isToolEnabled(name: string): boolean {
    const entry = this.tools.get(name);
    return entry?.enabled ?? false;
  }

  /**
   * Get a single tool's full definition (including inputSchema).
   * Returns undefined if tool doesn't exist.
   */
  getToolDefinition(name: string): Tool | undefined {
    return this.tools.get(name)?.definition;
  }

  /**
   * Get the category a tool belongs to.
   */
  getToolCategory(name: string): string | undefined {
    return this.tools.get(name)?.category;
  }

  /**
   * Execute any registered tool by name, regardless of enabled/disabled status.
   * Used by the ghl_execute proxy in stateless mode where dynamic tool lists aren't possible.
   */
  async executeToolDirect(name: string, args: Record<string, unknown>): Promise<unknown> {
    const entry = this.tools.get(name);
    if (!entry) {
      throw new Error(`Unknown tool: "${name}". Use search_tools to find available tools.`);
    }
    return entry.executor(name, args);
  }

  /**
   * Get all categories with metadata (for list_categories).
   */
  getCategories(): CategoryInfo[] {
    const result: CategoryInfo[] = [];

    for (const [key, cat] of this.categories) {
      const toolNames = this.getToolNamesForCategory(key);
      result.push({
        key,
        description: cat.description,
        enabled: cat.enabled,
        toolCount: toolNames.length,
        toolNames,
      });
    }

    return result;
  }

  /**
   * Search all tools (enabled and disabled) by keyword in name or description.
   */
  searchTools(query: string): ToolSearchResult[] {
    const q = query.toLowerCase();
    const results: ToolSearchResult[] = [];

    for (const [name, entry] of this.tools) {
      const desc = (entry.definition.description || '').toLowerCase();
      if (name.toLowerCase().includes(q) || desc.includes(q)) {
        results.push({
          name,
          description: entry.definition.description || '',
          category: entry.category,
          enabled: entry.enabled,
        });
      }
    }

    return results;
  }

  /**
   * Get total registered tool count.
   */
  getTotalToolCount(): number {
    return this.tools.size;
  }

  /**
   * Get count of enabled tools.
   */
  getEnabledToolCount(): number {
    let count = 0;
    for (const [, entry] of this.tools) {
      if (entry.enabled) count++;
    }
    return count;
  }

  private getToolNamesForCategory(category: string): string[] {
    const names: string[] = [];
    for (const [name, entry] of this.tools) {
      if (entry.category === category) {
        names.push(name);
      }
    }
    return names;
  }

  private notifyToolsChanged(): void {
    try {
      this.server.sendToolListChanged();
    } catch {
      // Notification may fail if not connected yet — that's ok
      process.stderr.write('[ToolRegistry] Could not send tools/list_changed notification\n');
    }
  }
}

/**
 * Discovery Tools
 *
 * Three always-on meta-tools for the GoHighLevel MCP server:
 *
 * 1. list_categories  — Show all 38 tool categories with tool counts
 * 2. search_tools     — Search tools by keyword, returns full input schemas
 * 3. ghl_execute      — Proxy: execute any GHL tool by name + arguments
 *
 * This design works in stateless environments (Vercel / Claude.ai connectors)
 * where the tool list is fetched once and cannot be dynamically updated.
 * Instead of enabling/disabling categories, Claude discovers tools via
 * search_tools (which returns input schemas) and executes them via ghl_execute.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolRegistry } from './tool-registry.js';

const DISCOVERY_TOOL_DEFINITIONS: Tool[] = [
  {
    name: 'list_categories',
    description:
      'List all available GoHighLevel tool categories with descriptions and tool counts. ' +
      'Call this first to understand what capabilities are available. ' +
      'Then use search_tools to find specific tools, and ghl_execute to run them.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'search_tools',
    description:
      'Search GoHighLevel tools by keyword. Returns matching tool names, descriptions, and full input schemas. ' +
      'Use the returned tool name and input schema to call ghl_execute. ' +
      'Example: search_tools({query: "contact"}) to find contact-related tools.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search keyword (e.g. "invoice", "appointment", "send sms", "contact")',
        },
        category: {
          type: 'string',
          description: 'Optional: filter results to a specific category (e.g. "contacts", "calendar")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'ghl_execute',
    description:
      'Execute any GoHighLevel tool by name. Use search_tools first to discover the tool name and required arguments. ' +
      'Pass the tool name and its arguments object. ' +
      'Example: ghl_execute({tool: "create_contact", arguments: {firstName: "John", lastName: "Doe", email: "john@example.com"}})',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tool: {
          type: 'string',
          description: 'The exact tool name to execute (from search_tools results)',
        },
        arguments: {
          type: 'object',
          description: 'The arguments to pass to the tool (see input schema from search_tools)',
          additionalProperties: true,
        },
      },
      required: ['tool', 'arguments'],
    },
  },
];

const DISCOVERY_TOOL_NAMES = new Set(DISCOVERY_TOOL_DEFINITIONS.map((t) => t.name));

export class DiscoveryTools {
  private registry: ToolRegistry;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  getDefinitions(): Tool[] {
    return DISCOVERY_TOOL_DEFINITIONS;
  }

  isDiscoveryTool(name: string): boolean {
    return DISCOVERY_TOOL_NAMES.has(name);
  }

  async execute(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: { type: string; text: string }[] }> {
    switch (name) {
      case 'list_categories':
        return this.listCategories();
      case 'search_tools':
        return this.searchTools(args.query as string, args.category as string | undefined);
      case 'ghl_execute':
        return this.ghlExecute(args.tool as string, (args.arguments as Record<string, unknown>) || {});
      default:
        throw new Error(`Unknown discovery tool: ${name}`);
    }
  }

  private listCategories() {
    const categories = this.registry.getCategories();
    const total = this.registry.getTotalToolCount();

    const lines = [
      `## GoHighLevel Tool Categories (${categories.length} categories, ${total} total tools)\n`,
      'Use `search_tools` to find specific tools by keyword, then `ghl_execute` to run them.\n',
    ];

    for (const cat of categories) {
      lines.push(`**${cat.key}** — ${cat.description} (${cat.toolCount} tools)`);
    }

    lines.push('');
    lines.push('---');
    lines.push('Workflow: search_tools({query: "keyword"}) → ghl_execute({tool: "tool_name", arguments: {...}})');

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }

  private searchTools(query: string, category?: string) {
    if (!query) {
      return {
        content: [{ type: 'text', text: 'Error: "query" parameter is required. Example: search_tools({query: "contact"})' }],
      };
    }

    let results = this.registry.searchTools(query);

    // Filter by category if provided
    if (category) {
      results = results.filter((r) => r.category === category);
    }

    if (results.length === 0) {
      return {
        content: [{ type: 'text', text: `No tools found matching "${query}"${category ? ` in category "${category}"` : ''}. Try a broader search term.` }],
      };
    }

    // Cap at 15 results to keep response manageable
    const capped = results.slice(0, 15);
    const lines = [`## Search results for "${query}" (${results.length} match${results.length !== 1 ? 'es' : ''}${results.length > 15 ? ', showing first 15' : ''})\n`];

    for (const t of capped) {
      const def = this.registry.getToolDefinition(t.name);
      lines.push(`### ${t.name}`);
      lines.push(`Category: ${t.category}`);
      lines.push(`Description: ${t.description}`);
      if (def?.inputSchema) {
        lines.push(`Input Schema: ${JSON.stringify(def.inputSchema)}`);
      }
      lines.push(`Execute: ghl_execute({tool: "${t.name}", arguments: {...}})`);
      lines.push('');
    }

    if (results.length > 15) {
      lines.push(`... and ${results.length - 15} more results. Narrow your search with a more specific query or add a category filter.`);
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }

  private async ghlExecute(toolName: string, toolArgs: Record<string, unknown>) {
    if (!toolName) {
      return {
        content: [{ type: 'text', text: 'Error: "tool" parameter is required. Use search_tools to find available tools.' }],
      };
    }

    if (!this.registry.hasTool(toolName)) {
      // Try to suggest similar tools
      const suggestions = this.registry.searchTools(toolName);
      const hint = suggestions.length > 0
        ? ` Did you mean: ${suggestions.slice(0, 5).map((s) => s.name).join(', ')}?`
        : ' Use search_tools to find available tools.';
      return {
        content: [{ type: 'text', text: `Error: Unknown tool "${toolName}".${hint}` }],
      };
    }

    try {
      const result = await this.registry.executeToolDirect(toolName, toolArgs);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error executing "${toolName}": ${error.message || error}` }],
      };
    }
  }
}

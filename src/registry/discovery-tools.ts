/**
 * Discovery Tools
 * The 6 always-on meta tools that let Claude explore and enable tool categories.
 * These are always visible regardless of which categories are enabled/disabled.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolRegistry } from './tool-registry.js';

const DISCOVERY_TOOL_DEFINITIONS: Tool[] = [
  {
    name: 'list_categories',
    description:
      'List all available tool categories with descriptions, tool counts, and enabled/disabled status. ' +
      'Call this first to discover what tools are available before enabling a category.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'enable_category',
    description:
      'Enable a tool category to make its tools available for use. ' +
      'After enabling, the new tools will appear in your tool list. ' +
      'Use list_categories first to see available categories.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          description: 'The category key to enable (e.g. "contacts", "calendar", "conversations")',
        },
      },
      required: ['category'],
    },
  },
  {
    name: 'disable_category',
    description:
      'Disable a tool category to remove its tools from your tool list and free up context space. ' +
      'Use this when you no longer need a category\'s tools.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          description: 'The category key to disable',
        },
      },
      required: ['category'],
    },
  },
  {
    name: 'enable_all_categories',
    description:
      'Enable all tool categories at once. WARNING: This exposes all 460+ tools which may use significant context. ' +
      'Prefer enabling only the categories you need.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'search_tools',
    description:
      'Search all tools (both enabled and disabled) by keyword in tool name or description. ' +
      'Useful for finding which category contains the tool you need.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search keyword (e.g. "invoice", "appointment", "send sms")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_enabled_tools',
    description:
      'List all currently enabled tools grouped by category. ' +
      'Shows what tools are currently available for use.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
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

  execute(name: string, args: Record<string, unknown>): { content: { type: string; text: string }[] } {
    switch (name) {
      case 'list_categories':
        return this.listCategories();
      case 'enable_category':
        return this.enableCategory(args.category as string);
      case 'disable_category':
        return this.disableCategory(args.category as string);
      case 'enable_all_categories':
        return this.enableAllCategories();
      case 'search_tools':
        return this.searchTools(args.query as string);
      case 'get_enabled_tools':
        return this.getEnabledTools();
      default:
        throw new Error(`Unknown discovery tool: ${name}`);
    }
  }

  private listCategories() {
    const categories = this.registry.getCategories();
    const total = this.registry.getTotalToolCount();
    const enabled = this.registry.getEnabledToolCount();

    const lines = [
      `## Tool Categories (${categories.length} categories, ${total} total tools, ${enabled} currently enabled)\n`,
    ];

    for (const cat of categories) {
      const status = cat.enabled ? '✅ ENABLED' : '⬚ disabled';
      lines.push(`**${cat.key}** — ${cat.description}`);
      lines.push(`  ${status} | ${cat.toolCount} tools`);
      lines.push('');
    }

    lines.push('---');
    lines.push('Use `enable_category` to enable a category, or `search_tools` to find specific tools.');

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }

  private enableCategory(category: string) {
    if (!category) {
      return {
        content: [{ type: 'text', text: 'Error: "category" parameter is required. Use list_categories to see available categories.' }],
      };
    }

    try {
      const result = this.registry.enableCategory(category);
      const lines = [
        `✅ Enabled category "${category}" — ${result.count} tools now available:\n`,
        ...result.enabled.map((name) => `  • ${name}`),
        '',
        'These tools are now available for use.',
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
    }
  }

  private disableCategory(category: string) {
    if (!category) {
      return {
        content: [{ type: 'text', text: 'Error: "category" parameter is required. Use list_categories to see available categories.' }],
      };
    }

    try {
      const result = this.registry.disableCategory(category);
      const lines = [
        `⬚ Disabled category "${category}" — ${result.count} tools removed.`,
        'Context space freed up for other tools.',
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
    }
  }

  private enableAllCategories() {
    const result = this.registry.enableAll();
    return {
      content: [{
        type: 'text',
        text:
          `✅ Enabled all categories — ${result.totalEnabled} tools now available.\n\n` +
          `⚠️  Warning: All tools are now exposed. This uses significant context space. ` +
          `Consider disabling categories you don't need with disable_category.`,
      }],
    };
  }

  private searchTools(query: string) {
    if (!query) {
      return {
        content: [{ type: 'text', text: 'Error: "query" parameter is required.' }],
      };
    }

    const results = this.registry.searchTools(query);

    if (results.length === 0) {
      return {
        content: [{ type: 'text', text: `No tools found matching "${query}". Try a broader search term.` }],
      };
    }

    const lines = [`## Search results for "${query}" (${results.length} matches)\n`];

    // Group by category
    const byCategory = new Map<string, typeof results>();
    for (const r of results) {
      if (!byCategory.has(r.category)) byCategory.set(r.category, []);
      byCategory.get(r.category)!.push(r);
    }

    for (const [cat, tools] of byCategory) {
      const anyEnabled = tools.some((t) => t.enabled);
      const status = anyEnabled ? '✅' : '⬚';
      lines.push(`**${status} ${cat}**`);
      for (const t of tools) {
        lines.push(`  • ${t.name} — ${t.description.slice(0, 100)}${t.description.length > 100 ? '…' : ''}`);
      }
      if (!anyEnabled) {
        lines.push(`  → Enable with: enable_category("${cat}")`);
      }
      lines.push('');
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }

  private getEnabledTools() {
    const categories = this.registry.getCategories().filter((c) => c.enabled);
    const enabledCount = this.registry.getEnabledToolCount();

    if (categories.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No categories are currently enabled. Use list_categories and enable_category to get started.',
        }],
      };
    }

    const lines = [`## Currently enabled: ${enabledCount} tools across ${categories.length} categories\n`];

    for (const cat of categories) {
      lines.push(`**${cat.key}** (${cat.toolCount} tools)`);
      for (const name of cat.toolNames) {
        lines.push(`  • ${name}`);
      }
      lines.push('');
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
}

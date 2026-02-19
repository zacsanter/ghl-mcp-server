/**
 * GoHighLevel MCP Server
 * Main entry point for the Model Context Protocol server.
 *
 * Uses dynamic tool discovery: only 6 meta-tools are exposed at startup.
 * Users enable tool categories on demand via enable_category / disable_category,
 * and the MCP `tools/list_changed` notification tells the client to re-fetch.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';

import { GHLApiClient } from './clients/ghl-api-client';
import { GHLConfig } from './types/ghl-types';
import { MCPAppsManager } from './apps/index.js';

// Registry
import { ToolRegistry } from './registry/tool-registry.js';
import { DiscoveryTools } from './registry/discovery-tools.js';
import { adaptToolModule } from './registry/tool-module-adapter.js';
import { CATEGORY_MANIFEST } from './registry/category-manifest.js';

// Tool modules (38 categories)
import { ContactTools } from './tools/contact-tools.js';
import { ConversationTools } from './tools/conversation-tools.js';
import { BlogTools } from './tools/blog-tools.js';
import { OpportunityTools } from './tools/opportunity-tools.js';
import { CalendarTools } from './tools/calendar-tools.js';
import { EmailTools } from './tools/email-tools.js';
import { LocationTools } from './tools/location-tools.js';
import { EmailISVTools } from './tools/email-isv-tools.js';
import { SocialMediaTools } from './tools/social-media-tools.js';
import { MediaTools } from './tools/media-tools.js';
import { ObjectTools } from './tools/object-tools.js';
import { AssociationTools } from './tools/association-tools.js';
import { CustomFieldV2Tools } from './tools/custom-field-v2-tools.js';
import { WorkflowTools } from './tools/workflow-tools.js';
import { SurveyTools } from './tools/survey-tools.js';
import { StoreTools } from './tools/store-tools.js';
import { ProductsTools } from './tools/products-tools.js';
import { PaymentsTools } from './tools/payments-tools.js';
import { InvoicesTools } from './tools/invoices-tools.js';
import { FormsTools } from './tools/forms-tools.js';
import { UsersTools } from './tools/users-tools.js';
import { FunnelsTools } from './tools/funnels-tools.js';
import { BusinessesTools } from './tools/businesses-tools.js';
import { LinksTools } from './tools/links-tools.js';
import { CompaniesTools } from './tools/companies-tools.js';
import { SaasTools } from './tools/saas-tools.js';
import { SnapshotsTools } from './tools/snapshots-tools.js';
import { CoursesTools } from './tools/courses-tools.js';
import { CampaignsTools } from './tools/campaigns-tools.js';
import { ReportingTools } from './tools/reporting-tools.js';
import { OAuthTools } from './tools/oauth-tools.js';
import { WebhooksTools } from './tools/webhooks-tools.js';
import { PhoneTools } from './tools/phone-tools.js';
import { ReputationTools } from './tools/reputation-tools.js';
import { AffiliatesTools } from './tools/affiliates-tools.js';
import { TemplatesTools } from './tools/templates-tools.js';
import { SmartListsTools } from './tools/smartlists-tools.js';
import { TriggersTools } from './tools/triggers-tools.js';

// Load environment variables
dotenv.config();

/**
 * Category key → Tool module class.
 * Order matches CATEGORY_MANIFEST for consistency.
 */
const CATEGORY_MODULES: [string, new (client: GHLApiClient) => any][] = [
  ['contacts', ContactTools],
  ['conversations', ConversationTools],
  ['blog', BlogTools],
  ['opportunities', OpportunityTools],
  ['calendar', CalendarTools],
  ['email', EmailTools],
  ['location', LocationTools],
  ['email-isv', EmailISVTools],
  ['social-media', SocialMediaTools],
  ['media', MediaTools],
  ['objects', ObjectTools],
  ['associations', AssociationTools],
  ['custom-fields-v2', CustomFieldV2Tools],
  ['workflows', WorkflowTools],
  ['surveys', SurveyTools],
  ['store', StoreTools],
  ['products', ProductsTools],
  ['payments', PaymentsTools],
  ['invoices', InvoicesTools],
  ['forms', FormsTools],
  ['users', UsersTools],
  ['funnels', FunnelsTools],
  ['businesses', BusinessesTools],
  ['links', LinksTools],
  ['companies', CompaniesTools],
  ['saas', SaasTools],
  ['snapshots', SnapshotsTools],
  ['courses', CoursesTools],
  ['campaigns', CampaignsTools],
  ['reporting', ReportingTools],
  ['oauth', OAuthTools],
  ['webhooks', WebhooksTools],
  ['phone', PhoneTools],
  ['reputation', ReputationTools],
  ['affiliates', AffiliatesTools],
  ['templates', TemplatesTools],
  ['smartlists', SmartListsTools],
  ['triggers', TriggersTools],
];

/**
 * Main MCP Server class
 */
class GHLMCPServer {
  private server: Server;
  private ghlClient: GHLApiClient;
  private registry: ToolRegistry;
  private discoveryTools: DiscoveryTools;
  private mcpAppsManager: MCPAppsManager;

  constructor() {
    this.server = new Server(
      { name: 'ghl-mcp-server', version: '1.0.0' },
      { capabilities: { tools: { listChanged: true }, resources: {} } }
    );

    this.ghlClient = this.initializeGHLClient();
    this.registry = new ToolRegistry(this.server);
    this.discoveryTools = new DiscoveryTools(this.registry);
    this.mcpAppsManager = new MCPAppsManager(this.ghlClient);

    this.registerAllCategories();
    this.setupHandlers();
  }

  /**
   * Initialize GoHighLevel API client with configuration
   */
  private initializeGHLClient(): GHLApiClient {
    const config: GHLConfig = {
      accessToken: process.env.GHL_API_KEY || '',
      baseUrl: process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com',
      version: '2021-07-28',
      locationId: process.env.GHL_LOCATION_ID || ''
    };

    if (!config.accessToken) {
      throw new Error('GHL_API_KEY environment variable is required');
    }
    if (!config.locationId) {
      throw new Error('GHL_LOCATION_ID environment variable is required');
    }

    process.stderr.write('[GHL MCP] Initializing GHL API client...\n');
    process.stderr.write(`[GHL MCP] Base URL: ${config.baseUrl}\n`);
    process.stderr.write(`[GHL MCP] Location ID: ${config.locationId}\n`);

    return new GHLApiClient(config);
  }

  /**
   * Instantiate each tool module, adapt it, and register with the ToolRegistry.
   * All categories start disabled — users enable on demand via discovery tools.
   */
  private registerAllCategories(): void {
    for (const [categoryKey, ModuleClass] of CATEGORY_MODULES) {
      const instance = new ModuleClass(this.ghlClient);
      const adapted = adaptToolModule(instance);
      const manifest = CATEGORY_MANIFEST.find(c => c.key === categoryKey);
      const description = manifest?.description ?? categoryKey;

      this.registry.registerCategory(
        categoryKey,
        description,
        adapted.getDefinitions(),
        adapted.execute.bind(adapted)
      );
    }

    process.stderr.write(
      `[GHL MCP] Registered ${this.registry.getTotalToolCount()} tools across ${CATEGORY_MODULES.length} categories (all disabled — use discovery tools to enable)\n`
    );
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // Resource handlers for MCP Apps
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resourceUris = this.mcpAppsManager.getResourceURIs();
      return {
        resources: resourceUris.map(uri => {
          const handler = this.mcpAppsManager.getResourceHandler(uri);
          return {
            uri,
            name: uri.replace('ui://ghl/', ''),
            mimeType: handler?.mimeType || 'text/html;profile=mcp-app'
          };
        })
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      const handler = this.mcpAppsManager.getResourceHandler(uri);
      if (!handler) {
        throw new McpError(ErrorCode.InvalidRequest, `Resource not found: ${uri}`);
      }
      return {
        contents: [{ uri, mimeType: handler.mimeType, text: handler.getContent() }]
      };
    });

    // List tools: discovery tools + enabled registry tools + app tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        ...this.discoveryTools.getDefinitions(),
        ...this.registry.getEnabledTools(),
        ...this.mcpAppsManager.getToolDefinitions(),
      ];
      process.stderr.write(`[GHL MCP] tools/list → ${tools.length} tools (${this.registry.getEnabledToolCount()} from registry)\n`);
      return { tools };
    });

    // Execute tools: discovery → apps → registry
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      process.stderr.write(`[GHL MCP] Executing tool: ${name}\n`);

      try {
        // 1. Discovery tools (always available, return CallToolResult directly)
        if (this.discoveryTools.isDiscoveryTool(name)) {
          return this.discoveryTools.execute(name, args || {});
        }

        // 2. MCP App tools (return structuredContent directly)
        if (this.mcpAppsManager.isAppTool(name)) {
          return await this.mcpAppsManager.executeTool(name, args || {});
        }

        // 3. Registry tools (category must be enabled)
        if (this.registry.hasTool(name)) {
          const result = await this.registry.executeTool(name, args || {});
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${name}`);
      } catch (error) {
        if (error instanceof McpError) throw error;
        const errorCode = error instanceof Error && error.message.includes('404')
          ? ErrorCode.InvalidRequest
          : ErrorCode.InternalError;
        throw new McpError(errorCode, `Tool execution failed: ${error}`);
      }
    });

    process.stderr.write('[GHL MCP] Request handlers setup complete\n');
  }

  /**
   * Test GHL API connection
   */
  private async testGHLConnection(): Promise<void> {
    try {
      process.stderr.write('[GHL MCP] Testing GHL API connection...\n');
      const result = await this.ghlClient.testConnection();
      process.stderr.write('[GHL MCP] ✅ GHL API connection successful\n');
      process.stderr.write(`[GHL MCP] Connected to location: ${result.data?.locationId}\n`);
    } catch (error) {
      console.error('[GHL MCP] ❌ GHL API connection failed:', error);
      throw new Error(`Failed to connect to GHL API: ${error}`);
    }
  }

  /**
   * Initialize and start the MCP server
   */
  async start(): Promise<void> {
    process.stderr.write('🚀 Starting GoHighLevel MCP Server...\n');

    try {
      await this.testGHLConnection();

      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      process.stderr.write('✅ GoHighLevel MCP Server started successfully!\n');
      process.stderr.write(`📋 ${this.registry.getTotalToolCount()} tools available across ${CATEGORY_MODULES.length} categories\n`);
      process.stderr.write('🔍 Use list_categories / enable_category to activate tool groups on demand\n');
    } catch (error) {
      console.error('❌ Failed to start GHL MCP Server:', error);
      process.exit(1);
    }
  }
}

/**
 * Handle graceful shutdown
 */
function setupGracefulShutdown(): void {
  const shutdown = (signal: string) => {
    process.stderr.write(`\n[GHL MCP] Received ${signal}, shutting down gracefully...\n`);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    setupGracefulShutdown();
    const server = new GHLMCPServer();
    await server.start();
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

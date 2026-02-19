/**
 * GoHighLevel MCP HTTP Server
 * HTTP version for ChatGPT web integration.
 *
 * Uses the same dynamic tool discovery as server.ts: only 6 meta-tools are
 * exposed at startup. Users enable tool categories on demand via
 * enable_category / disable_category.
 */

import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';

import { GHLApiClient } from './clients/ghl-api-client';
import { GHLConfig } from './types/ghl-types';

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
 * HTTP MCP Server class for web deployment
 */
class GHLMCPHttpServer {
  private app: express.Application;
  private server: Server;
  private ghlClient: GHLApiClient;
  private registry: ToolRegistry;
  private discoveryTools: DiscoveryTools;
  private port: number;

  constructor() {
    this.port = parseInt(process.env.PORT || process.env.MCP_SERVER_PORT || '8000');

    this.app = express();
    this.setupExpress();

    this.server = new Server(
      { name: 'ghl-mcp-server', version: '1.0.0' },
      { capabilities: { tools: { listChanged: true } } }
    );

    this.ghlClient = this.initializeGHLClient();
    this.registry = new ToolRegistry(this.server);
    this.discoveryTools = new DiscoveryTools(this.registry);

    this.registerAllCategories();
    this.setupMCPHandlers();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware and configuration
   */
  private setupExpress(): void {
    this.app.use(cors({
      origin: ['https://chatgpt.com', 'https://chat.openai.com', 'http://localhost:*'],
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true
    }));

    this.app.use(express.json());

    this.app.use((req, _res, next) => {
      console.log(`[HTTP] ${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });
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

    console.log('[GHL MCP HTTP] Initializing GHL API client...');
    console.log(`[GHL MCP HTTP] Base URL: ${config.baseUrl}`);
    console.log(`[GHL MCP HTTP] Location ID: ${config.locationId}`);

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

    console.log(
      `[GHL MCP HTTP] Registered ${this.registry.getTotalToolCount()} tools across ${CATEGORY_MODULES.length} categories (all disabled — use discovery tools to enable)`
    );
  }

  /**
   * Setup MCP request handlers
   */
  private setupMCPHandlers(): void {
    // List tools: discovery tools + enabled registry tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        ...this.discoveryTools.getDefinitions(),
        ...this.registry.getEnabledTools(),
      ];
      console.log(`[GHL MCP HTTP] tools/list → ${tools.length} tools (${this.registry.getEnabledToolCount()} from registry)`);
      return { tools };
    });

    // Execute tools: discovery → registry
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      console.log(`[GHL MCP HTTP] Executing tool: ${name}`);

      try {
        // 1. Discovery tools (always available)
        if (this.discoveryTools.isDiscoveryTool(name)) {
          return this.discoveryTools.execute(name, args || {});
        }

        // 2. Registry tools (category must be enabled)
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

    console.log('[GHL MCP HTTP] MCP request handlers setup complete');
  }

  /**
   * Setup HTTP routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        server: 'ghl-mcp-server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        tools: {
          total: this.registry.getTotalToolCount(),
          enabled: this.registry.getEnabledToolCount(),
          categories: CATEGORY_MODULES.length
        }
      });
    });

    // MCP capabilities endpoint
    this.app.get('/capabilities', (_req, res) => {
      res.json({
        capabilities: {
          tools: { listChanged: true },
        },
        server: {
          name: 'ghl-mcp-server',
          version: '1.0.0'
        }
      });
    });

    // Tools listing endpoint
    this.app.get('/tools', (_req, res) => {
      try {
        const enabledTools = this.registry.getEnabledTools();
        const discoveryDefs = this.discoveryTools.getDefinitions();
        const allTools = [...discoveryDefs, ...enabledTools];
        res.json({
          tools: allTools,
          count: allTools.length,
          totalRegistered: this.registry.getTotalToolCount()
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to list tools' });
      }
    });

    // SSE endpoint for ChatGPT MCP connection
    const handleSSE = async (req: express.Request, res: express.Response) => {
      const sessionId = req.query.sessionId || 'unknown';
      console.log(`[GHL MCP HTTP] New SSE connection from: ${req.ip}, sessionId: ${sessionId}, method: ${req.method}`);

      try {
        const transport = new SSEServerTransport('/sse', res);
        await this.server.connect(transport);
        console.log(`[GHL MCP HTTP] SSE connection established for session: ${sessionId}`);

        req.on('close', () => {
          console.log(`[GHL MCP HTTP] SSE connection closed for session: ${sessionId}`);
        });
      } catch (error) {
        console.error(`[GHL MCP HTTP] SSE connection error for session ${sessionId}:`, error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to establish SSE connection' });
        } else {
          res.end();
        }
      }
    };

    this.app.get('/sse', handleSSE);
    this.app.post('/sse', handleSSE);

    // Root endpoint with server info
    this.app.get('/', (_req, res) => {
      res.json({
        name: 'GoHighLevel MCP Server',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          capabilities: '/capabilities',
          tools: '/tools',
          sse: '/sse'
        },
        tools: {
          total: this.registry.getTotalToolCount(),
          enabled: this.registry.getEnabledToolCount(),
          categories: CATEGORY_MODULES.length
        }
      });
    });
  }

  /**
   * Test GHL API connection
   */
  private async testGHLConnection(): Promise<void> {
    try {
      console.log('[GHL MCP HTTP] Testing GHL API connection...');
      const result = await this.ghlClient.testConnection();
      console.log('[GHL MCP HTTP] ✅ GHL API connection successful');
      console.log(`[GHL MCP HTTP] Connected to location: ${result.data?.locationId}`);
    } catch (error) {
      console.error('[GHL MCP HTTP] ❌ GHL API connection failed:', error);
      throw new Error(`Failed to connect to GHL API: ${error}`);
    }
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    console.log('🚀 Starting GoHighLevel MCP HTTP Server...');

    try {
      await this.testGHLConnection();

      this.app.listen(this.port, '0.0.0.0', () => {
        console.log('✅ GoHighLevel MCP HTTP Server started successfully!');
        console.log(`🌐 Server running on: http://0.0.0.0:${this.port}`);
        console.log(`🔗 SSE Endpoint: http://0.0.0.0:${this.port}/sse`);
        console.log(`📋 ${this.registry.getTotalToolCount()} tools available across ${CATEGORY_MODULES.length} categories`);
        console.log('🔍 Use list_categories / enable_category to activate tool groups on demand');
      });
    } catch (error) {
      console.error('❌ Failed to start GHL MCP HTTP Server:', error);
      process.exit(1);
    }
  }
}

/**
 * Handle graceful shutdown
 */
function setupGracefulShutdown(): void {
  const shutdown = (signal: string) => {
    console.log(`\n[GHL MCP HTTP] Received ${signal}, shutting down gracefully...`);
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
    const server = new GHLMCPHttpServer();
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

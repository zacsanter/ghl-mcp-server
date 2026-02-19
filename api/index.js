// GoHighLevel MCP Server - Vercel Serverless Handler
// Uses Streamable HTTP transport with proxy-based tool discovery.
// Only 3 meta-tools are exposed: list_categories, search_tools, ghl_execute.
// Claude discovers tools via search, then executes them through the ghl_execute proxy.

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require("@modelcontextprotocol/sdk/types.js");

// Registry imports (compiled from src/registry/)
const { ToolRegistry } = require("../dist/registry/tool-registry.js");
const { DiscoveryTools } = require("../dist/registry/discovery-tools.js");
const { adaptToolModule } = require("../dist/registry/tool-module-adapter.js");
const { CATEGORY_MANIFEST } = require("../dist/registry/category-manifest.js");

// GHL API client
const { GHLApiClient } = require("../dist/clients/ghl-api-client.js");

// All 38 tool modules
const { ContactTools } = require("../dist/tools/contact-tools.js");
const { ConversationTools } = require("../dist/tools/conversation-tools.js");
const { BlogTools } = require("../dist/tools/blog-tools.js");
const { OpportunityTools } = require("../dist/tools/opportunity-tools.js");
const { CalendarTools } = require("../dist/tools/calendar-tools.js");
const { EmailTools } = require("../dist/tools/email-tools.js");
const { LocationTools } = require("../dist/tools/location-tools.js");
const { EmailISVTools } = require("../dist/tools/email-isv-tools.js");
const { SocialMediaTools } = require("../dist/tools/social-media-tools.js");
const { MediaTools } = require("../dist/tools/media-tools.js");
const { ObjectTools } = require("../dist/tools/object-tools.js");
const { AssociationTools } = require("../dist/tools/association-tools.js");
const { CustomFieldV2Tools } = require("../dist/tools/custom-field-v2-tools.js");
const { WorkflowTools } = require("../dist/tools/workflow-tools.js");
const { SurveyTools } = require("../dist/tools/survey-tools.js");
const { StoreTools } = require("../dist/tools/store-tools.js");
const { ProductsTools } = require("../dist/tools/products-tools.js");
const { PaymentsTools } = require("../dist/tools/payments-tools.js");
const { InvoicesTools } = require("../dist/tools/invoices-tools.js");
const { FormsTools } = require("../dist/tools/forms-tools.js");
const { UsersTools } = require("../dist/tools/users-tools.js");
const { FunnelsTools } = require("../dist/tools/funnels-tools.js");
const { BusinessesTools } = require("../dist/tools/businesses-tools.js");
const { LinksTools } = require("../dist/tools/links-tools.js");
const { CompaniesTools } = require("../dist/tools/companies-tools.js");
const { SaasTools } = require("../dist/tools/saas-tools.js");
const { SnapshotsTools } = require("../dist/tools/snapshots-tools.js");
const { CoursesTools } = require("../dist/tools/courses-tools.js");
const { CampaignsTools } = require("../dist/tools/campaigns-tools.js");
const { ReportingTools } = require("../dist/tools/reporting-tools.js");
const { OAuthTools } = require("../dist/tools/oauth-tools.js");
const { WebhooksTools } = require("../dist/tools/webhooks-tools.js");
const { PhoneTools } = require("../dist/tools/phone-tools.js");
const { ReputationTools } = require("../dist/tools/reputation-tools.js");
const { AffiliatesTools } = require("../dist/tools/affiliates-tools.js");
const { TemplatesTools } = require("../dist/tools/templates-tools.js");
const { SmartListsTools } = require("../dist/tools/smartlists-tools.js");
const { TriggersTools } = require("../dist/tools/triggers-tools.js");

/**
 * Category key -> Tool module class.
 * Order matches CATEGORY_MANIFEST.
 */
const CATEGORY_MODULES = [
  ["contacts", ContactTools],
  ["conversations", ConversationTools],
  ["blog", BlogTools],
  ["opportunities", OpportunityTools],
  ["calendar", CalendarTools],
  ["email", EmailTools],
  ["location", LocationTools],
  ["email-isv", EmailISVTools],
  ["social-media", SocialMediaTools],
  ["media", MediaTools],
  ["objects", ObjectTools],
  ["associations", AssociationTools],
  ["custom-fields-v2", CustomFieldV2Tools],
  ["workflows", WorkflowTools],
  ["surveys", SurveyTools],
  ["store", StoreTools],
  ["products", ProductsTools],
  ["payments", PaymentsTools],
  ["invoices", InvoicesTools],
  ["forms", FormsTools],
  ["users", UsersTools],
  ["funnels", FunnelsTools],
  ["businesses", BusinessesTools],
  ["links", LinksTools],
  ["companies", CompaniesTools],
  ["saas", SaasTools],
  ["snapshots", SnapshotsTools],
  ["courses", CoursesTools],
  ["campaigns", CampaignsTools],
  ["reporting", ReportingTools],
  ["oauth", OAuthTools],
  ["webhooks", WebhooksTools],
  ["phone", PhoneTools],
  ["reputation", ReputationTools],
  ["affiliates", AffiliatesTools],
  ["templates", TemplatesTools],
  ["smartlists", SmartListsTools],
  ["triggers", TriggersTools],
];

// ---------- Singleton state (persists across warm lambda invocations) ----------

let ghlClient = null;
let registry = null;
let discoveryTools = null;

function ensureInitialized() {
  if (registry) return; // already warm

  const config = {
    accessToken: process.env.GHL_API_KEY || "",
    baseUrl: process.env.GHL_BASE_URL || "https://services.leadconnectorhq.com",
    version: "2021-07-28",
    locationId: process.env.GHL_LOCATION_ID || "",
  };

  if (!config.accessToken || !config.locationId) {
    throw new Error("GHL_API_KEY and GHL_LOCATION_ID environment variables are required");
  }

  ghlClient = new GHLApiClient(config);

  // ToolRegistry needs a Server instance for sendToolListChanged(),
  // but in stateless Vercel mode we recreate the server per request.
  // Pass a stub that noops — the discovery tools handle state internally.
  const stubServer = { sendToolListChanged: () => {} };
  registry = new ToolRegistry(stubServer);
  discoveryTools = new DiscoveryTools(registry);

  // Register all 38 categories (all start disabled)
  for (const [categoryKey, ModuleClass] of CATEGORY_MODULES) {
    const instance = new ModuleClass(ghlClient);
    const adapted = adaptToolModule(instance);
    const manifest = CATEGORY_MANIFEST.find((c) => c.key === categoryKey);
    const description = manifest ? manifest.description : categoryKey;
    registry.registerCategory(categoryKey, description, adapted.getDefinitions(), adapted.execute.bind(adapted));
  }

  console.log(
    `[GHL MCP Vercel] Initialized: ${registry.getTotalToolCount()} tools across ${CATEGORY_MODULES.length} categories (proxy mode via ghl_execute)`
  );
}

// ---------- Per-request MCP server ----------

function createMCPServer() {
  ensureInitialized();

  const server = new Server(
    { name: "ghl-mcp-server", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // List tools: only 3 discovery/proxy tools (list_categories, search_tools, ghl_execute)
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = discoveryTools.getDefinitions();
    console.log(`[GHL MCP Vercel] tools/list -> ${tools.length} discovery tools (${registry.getTotalToolCount()} available via ghl_execute)`);
    return { tools };
  });

  // Execute tools: all 3 are discovery tools (ghl_execute proxies to the registry internally)
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.log(`[GHL MCP Vercel] Executing tool: ${name}`);

    try {
      if (discoveryTools.isDiscoveryTool(name)) {
        return await discoveryTools.execute(name, args || {});
      }
      throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${name}. Available tools: list_categories, search_tools, ghl_execute`);
    } catch (error) {
      if (error instanceof McpError) throw error;
      console.error(`[GHL MCP Vercel] Error executing tool ${name}:`, error);
      throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error}`);
    }
  });

  return server;
}

// ---------- Vercel serverless handler ----------

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, Mcp-Session-Id");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Health check
  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    try {
      ensureInitialized();
      res.status(200).json({
        status: "healthy",
        server: "ghl-mcp-server",
        version: "1.0.0",
        transport: "streamable-http",
        mode: "proxy-discovery",
        discoveryTools: 3,
        totalTools: registry.getTotalToolCount(),
        categories: CATEGORY_MODULES.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  // MCP Streamable HTTP handler
  try {
    const server = createMCPServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
      enableJsonResponse: true,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("[GHL MCP Vercel] Request error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: `Server error: ${error.message}` },
        id: null,
      });
    }
  }
};

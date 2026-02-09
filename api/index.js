// GoHighLevel MCP Server - Vercel Serverless Handler
// Uses Streamable HTTP transport for stateless serverless deployment
// All 461+ tools from the full GHL MCP server

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require("@modelcontextprotocol/sdk/types.js");

// Import GHL client and all tool modules from compiled dist
const { GHLApiClient } = require("../dist/clients/ghl-api-client.js");
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

// Initialize GHL client
function createGHLClient() {
  const config = {
    accessToken: process.env.GHL_API_KEY || "",
    baseUrl: process.env.GHL_BASE_URL || "https://services.leadconnectorhq.com",
    version: "2021-07-28",
    locationId: process.env.GHL_LOCATION_ID || "",
  };

  if (!config.accessToken || !config.locationId) {
    throw new Error("GHL_API_KEY and GHL_LOCATION_ID environment variables are required");
  }

  return new GHLApiClient(config);
}

// Initialize all tool instances
function createToolInstances(client) {
  return {
    contact: new ContactTools(client),
    conversation: new ConversationTools(client),
    blog: new BlogTools(client),
    opportunity: new OpportunityTools(client),
    calendar: new CalendarTools(client),
    email: new EmailTools(client),
    location: new LocationTools(client),
    emailISV: new EmailISVTools(client),
    socialMedia: new SocialMediaTools(client),
    media: new MediaTools(client),
    object: new ObjectTools(client),
    association: new AssociationTools(client),
    customFieldV2: new CustomFieldV2Tools(client),
    workflow: new WorkflowTools(client),
    survey: new SurveyTools(client),
    store: new StoreTools(client),
    products: new ProductsTools(client),
    payments: new PaymentsTools(client),
    invoices: new InvoicesTools(client),
    forms: new FormsTools(client),
    users: new UsersTools(client),
    funnels: new FunnelsTools(client),
    businesses: new BusinessesTools(client),
    links: new LinksTools(client),
    companies: new CompaniesTools(client),
    saas: new SaasTools(client),
    snapshots: new SnapshotsTools(client),
    courses: new CoursesTools(client),
    campaigns: new CampaignsTools(client),
    reporting: new ReportingTools(client),
    oauth: new OAuthTools(client),
    webhooks: new WebhooksTools(client),
    phone: new PhoneTools(client),
    reputation: new ReputationTools(client),
    affiliates: new AffiliatesTools(client),
    templates: new TemplatesTools(client),
    smartLists: new SmartListsTools(client),
    triggers: new TriggersTools(client),
  };
}

// Get all tool definitions from all modules
function getAllToolDefinitions(tools) {
  const allDefs = [];
  // Modules that use getToolDefinitions()
  const defModules = [
    "contact", "conversation", "blog", "opportunity", "calendar",
    "email", "location", "emailISV", "media", "object",
    "forms", "users", "funnels", "businesses", "links",
    "companies", "saas", "snapshots", "courses", "campaigns",
    "reporting", "oauth", "webhooks", "phone", "reputation",
    "affiliates", "templates", "smartLists", "triggers",
  ];
  // Modules that use getTools()
  const getToolsModules = [
    "socialMedia", "association", "customFieldV2", "workflow",
    "survey", "store", "products", "payments", "invoices",
  ];

  for (const mod of defModules) {
    try {
      if (tools[mod] && typeof tools[mod].getToolDefinitions === "function") {
        allDefs.push(...tools[mod].getToolDefinitions());
      }
    } catch (e) {
      console.error(`Error getting tool definitions for ${mod}:`, e.message);
    }
  }
  for (const mod of getToolsModules) {
    try {
      if (tools[mod] && typeof tools[mod].getTools === "function") {
        allDefs.push(...tools[mod].getTools());
      }
    } catch (e) {
      console.error(`Error getting tools for ${mod}:`, e.message);
    }
  }
  return allDefs;
}

// Tool name routing map — maps tool names to their handler module and method
function buildToolRouter(tools) {
  // Each entry: { module, method }
  const routes = {};

  // Helper to register all tool names from a module
  function registerModule(toolNames, moduleName, method) {
    for (const name of toolNames) {
      routes[name] = { module: moduleName, method };
    }
  }

  // Contact tools
  registerModule([
    "create_contact", "search_contacts", "get_contact", "update_contact",
    "add_contact_tags", "remove_contact_tags", "delete_contact",
    "get_contact_tasks", "create_contact_task", "get_contact_task", "update_contact_task",
    "delete_contact_task", "update_task_completion",
    "get_contact_notes", "create_contact_note", "get_contact_note", "update_contact_note",
    "delete_contact_note", "upsert_contact", "get_duplicate_contact",
    "get_contacts_by_business", "get_contact_appointments",
    "bulk_update_contact_tags", "bulk_update_contact_business",
    "add_contact_followers", "remove_contact_followers",
    "add_contact_to_campaign", "remove_contact_from_campaign", "remove_contact_from_all_campaigns",
    "add_contact_to_workflow", "remove_contact_from_workflow",
  ], "contact", "executeTool");

  // Conversation tools
  registerModule([
    "send_sms", "send_email", "search_conversations", "get_conversation",
    "create_conversation", "update_conversation", "delete_conversation", "get_recent_messages",
    "get_email_message", "get_message", "upload_message_attachments", "update_message_status",
    "add_inbound_message", "add_outbound_call",
    "get_message_recording", "get_message_transcription", "download_transcription",
    "cancel_scheduled_message", "cancel_scheduled_email", "live_chat_typing",
  ], "conversation", "executeTool");

  // Blog tools
  registerModule([
    "create_blog_post", "update_blog_post", "get_blog_posts", "get_blog_sites",
    "get_blog_authors", "get_blog_categories", "check_url_slug",
  ], "blog", "executeTool");

  // Opportunity tools
  registerModule([
    "search_opportunities", "get_pipelines", "get_opportunity", "create_opportunity",
    "update_opportunity_status", "delete_opportunity", "update_opportunity",
    "upsert_opportunity", "add_opportunity_followers", "remove_opportunity_followers",
  ], "opportunity", "executeTool");

  // Calendar tools
  registerModule([
    "get_calendar_groups", "create_calendar_group", "validate_group_slug",
    "update_calendar_group", "delete_calendar_group", "disable_calendar_group",
    "get_calendars", "create_calendar", "get_calendar", "update_calendar", "delete_calendar",
    "get_calendar_events", "get_free_slots", "create_appointment", "get_appointment",
    "update_appointment", "delete_appointment",
    "get_appointment_notes", "create_appointment_note", "update_appointment_note", "delete_appointment_note",
    "get_calendar_resources", "get_calendar_resource_by_id", "update_calendar_resource", "delete_calendar_resource",
    "get_calendar_notifications", "create_calendar_notification", "update_calendar_notification", "delete_calendar_notification",
    "create_block_slot", "update_block_slot", "get_blocked_slots", "delete_blocked_slot",
  ], "calendar", "executeTool");

  // Email tools
  registerModule([
    "get_email_campaigns", "create_email_template", "get_email_templates",
    "update_email_template", "delete_email_template",
  ], "email", "executeTool");

  // Location tools
  registerModule([
    "search_locations", "get_location", "create_location", "update_location", "delete_location",
    "get_location_tags", "create_location_tag", "get_location_tag", "update_location_tag", "delete_location_tag",
    "search_location_tasks",
    "get_location_custom_fields", "create_location_custom_field", "get_location_custom_field",
    "update_location_custom_field", "delete_location_custom_field",
    "get_location_custom_values", "create_location_custom_value", "get_location_custom_value",
    "update_location_custom_value", "delete_location_custom_value",
    "get_location_templates", "delete_location_template", "get_timezones",
  ], "location", "executeTool");

  // Email ISV
  registerModule(["verify_email"], "emailISV", "executeTool");

  // Social Media tools
  registerModule([
    "search_social_posts", "create_social_post", "get_social_post", "update_social_post",
    "delete_social_post", "bulk_delete_social_posts",
    "get_social_accounts", "delete_social_account",
    "upload_social_csv", "get_csv_upload_status", "set_csv_accounts",
    "get_social_categories", "get_social_category", "get_social_tags", "get_social_tags_by_ids",
    "start_social_oauth", "get_platform_accounts",
  ], "socialMedia", "executeTool");

  // Media tools
  registerModule(["get_media_files", "upload_media_file", "delete_media_file"], "media", "executeTool");

  // Object tools
  registerModule([
    "get_all_objects", "create_object_schema", "get_object_schema", "update_object_schema",
    "create_object_record", "get_object_record", "update_object_record", "delete_object_record",
    "search_object_records",
  ], "object", "executeTool");

  // Association tools
  registerModule([
    "ghl_get_all_associations", "ghl_create_association", "ghl_get_association_by_id",
    "ghl_update_association", "ghl_delete_association", "ghl_get_association_by_key",
    "ghl_get_association_by_object_key", "ghl_create_relation", "ghl_get_relations_by_record",
    "ghl_delete_relation",
  ], "association", "executeAssociationTool");

  // Custom Field V2
  registerModule([
    "ghl_get_custom_field_by_id", "ghl_create_custom_field", "ghl_update_custom_field",
    "ghl_delete_custom_field", "ghl_get_custom_fields_by_object_key", "ghl_create_custom_field_folder",
    "ghl_update_custom_field_folder", "ghl_delete_custom_field_folder",
  ], "customFieldV2", "executeCustomFieldV2Tool");

  // Workflow tools
  registerModule(["ghl_get_workflows"], "workflow", "executeWorkflowTool");

  // Survey tools
  registerModule(["ghl_get_surveys", "ghl_get_survey_submissions"], "survey", "executeSurveyTool");

  // Store tools
  registerModule([
    "ghl_create_shipping_zone", "ghl_list_shipping_zones", "ghl_get_shipping_zone",
    "ghl_update_shipping_zone", "ghl_delete_shipping_zone", "ghl_get_available_shipping_rates",
    "ghl_create_shipping_rate", "ghl_list_shipping_rates", "ghl_get_shipping_rate",
    "ghl_update_shipping_rate", "ghl_delete_shipping_rate", "ghl_create_shipping_carrier",
    "ghl_list_shipping_carriers", "ghl_get_shipping_carrier", "ghl_update_shipping_carrier",
    "ghl_delete_shipping_carrier", "ghl_create_store_setting", "ghl_get_store_setting",
  ], "store", "executeStoreTool");

  // Products tools
  registerModule([
    "ghl_create_product", "ghl_list_products", "ghl_get_product", "ghl_update_product",
    "ghl_delete_product", "ghl_bulk_update_products", "ghl_create_price", "ghl_list_prices",
    "ghl_get_price", "ghl_update_price", "ghl_delete_price", "ghl_list_inventory",
    "ghl_update_inventory", "ghl_get_product_store_stats", "ghl_update_product_store",
    "ghl_create_product_collection", "ghl_list_product_collections", "ghl_get_product_collection",
    "ghl_update_product_collection", "ghl_delete_product_collection", "ghl_list_product_reviews",
    "ghl_get_reviews_count", "ghl_update_product_review", "ghl_delete_product_review",
    "ghl_bulk_update_product_reviews",
  ], "products", "executeProductsTool");

  // Modules using handleToolCall method - register dynamically via tool definitions
  const handleToolCallModules = [
    "payments", "invoices", "forms", "users", "funnels", "businesses",
    "links", "companies", "saas", "snapshots", "courses", "campaigns",
    "reporting", "oauth", "webhooks", "phone", "reputation", "affiliates",
    "templates", "smartLists", "triggers",
  ];

  return { routes, handleToolCallModules };
}

// Singleton instances (reused across invocations in warm lambdas)
let ghlClient = null;
let toolInstances = null;
let toolRouter = null;

function ensureInitialized() {
  if (!ghlClient) {
    ghlClient = createGHLClient();
    toolInstances = createToolInstances(ghlClient);
    toolRouter = buildToolRouter(toolInstances);
  }
}

// Create and configure MCP server for each request (stateless)
function createMCPServer() {
  ensureInitialized();

  const server = new Server(
    { name: "ghl-mcp-server", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const allTools = getAllToolDefinitions(toolInstances);
    console.log(`[GHL MCP Vercel] Returning ${allTools.length} tools`);
    return { tools: allTools };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.log(`[GHL MCP Vercel] Executing tool: ${name}`);

    try {
      let result;
      const { routes, handleToolCallModules } = toolRouter;

      // Check explicit routes first
      if (routes[name]) {
        const { module: modName, method } = routes[name];
        result = await toolInstances[modName][method](name, args || {});
      } else {
        // Try handleToolCall modules as fallback
        let handled = false;
        for (const modName of handleToolCallModules) {
          try {
            if (toolInstances[modName] && typeof toolInstances[modName].handleToolCall === "function") {
              // Check if this module has tool definitions that include this tool name
              const defs = typeof toolInstances[modName].getToolDefinitions === "function"
                ? toolInstances[modName].getToolDefinitions()
                : typeof toolInstances[modName].getTools === "function"
                  ? toolInstances[modName].getTools()
                  : [];
              const hasThisTool = defs.some((d) => d.name === name);
              if (hasThisTool) {
                result = await toolInstances[modName].handleToolCall(name, args || {});
                handled = true;
                break;
              }
            }
          } catch (e) {
            // Continue to next module
          }
        }
        if (!handled) {
          throw new Error(`Unknown tool: ${name}`);
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      console.error(`[GHL MCP Vercel] Error executing tool ${name}:`, error);
      throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error}`);
    }
  });

  return server;
}

// Vercel serverless handler
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
      const allTools = getAllToolDefinitions(toolInstances);
      res.status(200).json({
        status: "healthy",
        server: "ghl-mcp-server",
        version: "1.0.0",
        transport: "streamable-http",
        tools: allTools.length,
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
      enableJsonResponse: true, // JSON responses instead of SSE (works with serverless)
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

/**
 * MCP Apps Manager
 * Manages rich UI components for GoHighLevel MCP Server
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GHLApiClient } from '../clients/ghl-api-client.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

export interface AppToolResult {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AppResourceHandler {
  uri: string;
  mimeType: string;
  getContent: () => string;
}

/**
 * MCP Apps Manager class
 * Registers app tools and handles structuredContent responses
 */
// Resolve UI build path - works regardless of working directory
function getUIBuildPath(): string {
  // When compiled, this file is at dist/apps/index.js
  // UI files are at dist/app-ui/
  // Use __dirname which is available in CommonJS
  const fromDist = path.resolve(__dirname, '..', 'app-ui');
  if (fs.existsSync(fromDist)) {
    return fromDist;
  }
  // Fallback: try process.cwd() based paths
  const appUiPath = path.join(process.cwd(), 'dist', 'app-ui');
  if (fs.existsSync(appUiPath)) {
    return appUiPath;
  }
  // Default fallback
  return fromDist;
}

export class MCPAppsManager {
  private ghlClient: GHLApiClient;
  private resourceHandlers: Map<string, AppResourceHandler> = new Map();
  private uiBuildPath: string;

  constructor(ghlClient: GHLApiClient) {
    this.ghlClient = ghlClient;
    this.uiBuildPath = getUIBuildPath();
    process.stderr.write(`[MCP Apps] UI build path: ${this.uiBuildPath}\n`);
    this.registerResourceHandlers();
  }

  /**
   * Register all UI resource handlers
   */
  private registerResourceHandlers(): void {
    const resources: Array<{ uri: string; file: string }> = [
      // All 11 MCP Apps
      { uri: 'ui://ghl/mcp-app', file: 'mcp-app.html' },
      { uri: 'ui://ghl/pipeline-board', file: 'pipeline-board.html' },
      { uri: 'ui://ghl/quick-book', file: 'quick-book.html' },
      { uri: 'ui://ghl/opportunity-card', file: 'opportunity-card.html' },
      { uri: 'ui://ghl/contact-grid', file: 'contact-grid.html' },
      { uri: 'ui://ghl/calendar-view', file: 'calendar-view.html' },
      { uri: 'ui://ghl/invoice-preview', file: 'invoice-preview.html' },
      { uri: 'ui://ghl/campaign-stats', file: 'campaign-stats.html' },
      { uri: 'ui://ghl/agent-stats', file: 'agent-stats.html' },
      { uri: 'ui://ghl/contact-timeline', file: 'contact-timeline.html' },
      { uri: 'ui://ghl/workflow-status', file: 'workflow-status.html' },
    ];

    for (const resource of resources) {
      this.resourceHandlers.set(resource.uri, {
        uri: resource.uri,
        mimeType: 'text/html;profile=mcp-app',
        getContent: () => this.loadUIResource(resource.file),
      });
    }
  }

  /**
   * Load UI resource from build directory
   */
  private loadUIResource(filename: string): string {
    const filePath = path.join(this.uiBuildPath, filename);
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      process.stderr.write(`[MCP Apps] UI resource not found: ${filePath}\n`);
      return this.getFallbackHTML(filename);
    }
  }

  /**
   * Generate fallback HTML when UI resource is not built
   */
  private getFallbackHTML(filename: string): string {
    const componentName = filename.replace('.html', '');
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GHL ${componentName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
    .fallback { text-align: center; color: #666; }
  </style>
</head>
<body>
  <div class="fallback">
    <p>UI component "${componentName}" is loading...</p>
    <p>Run <code>npm run build:ui</code> to build UI components.</p>
  </div>
  <script>
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'mcp-app-init') {
        console.log('MCP App data:', e.data.data);
      }
    });
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Get tool definitions for all app tools
   */
  getToolDefinitions(): Tool[] {
    return [
      // 1. Contact Grid - search and display contacts
      {
        name: 'view_contact_grid',
        description: 'Display contact search results in a data grid with sorting and pagination. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query string' },
            limit: { type: 'number', description: 'Maximum results (default: 25)' }
          }
        },
        _meta: {
          ui: { resourceUri: 'ui://ghl/contact-grid' }
        }
      },
      // 2. Pipeline Board - Kanban view of opportunities
      {
        name: 'view_pipeline_board',
        description: 'Display a pipeline as an interactive Kanban board with opportunities. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            pipelineId: { type: 'string', description: 'Pipeline ID to display' }
          },
          required: ['pipelineId']
        },
        _meta: {
          ui: { resourceUri: 'ui://ghl/pipeline-board' }
        }
      },
      // 3. Quick Book - appointment booking
      {
        name: 'view_quick_book',
        description: 'Display a quick booking interface for scheduling appointments. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID for booking' },
            contactId: { type: 'string', description: 'Optional contact ID to pre-fill' }
          },
          required: ['calendarId']
        },
        _meta: {
          ui: { resourceUri: 'ui://ghl/quick-book' }
        }
      },
      // 4. Opportunity Card - single opportunity details
      {
        name: 'view_opportunity_card',
        description: 'Display a single opportunity with details, value, and stage info. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            opportunityId: { type: 'string', description: 'Opportunity ID to display' }
          },
          required: ['opportunityId']
        },
        _meta: {
          ui: { resourceUri: 'ui://ghl/opportunity-card' }
        }
      },
      // 5. Calendar View - calendar with events
      {
        name: 'view_calendar',
        description: 'Display a calendar with events and appointments. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID to display' },
            startDate: { type: 'string', description: 'Start date (ISO format)' },
            endDate: { type: 'string', description: 'End date (ISO format)' }
          },
          required: ['calendarId']
        },
        _meta: {
          ui: { resourceUri: 'ui://ghl/calendar-view' }
        }
      },
      // 6. Invoice Preview - invoice details
      {
        name: 'view_invoice',
        description: 'Display an invoice preview with line items and payment status. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            invoiceId: { type: 'string', description: 'Invoice ID to display' }
          },
          required: ['invoiceId']
        },
        _meta: {
          ui: { resourceUri: 'ui://ghl/invoice-preview' }
        }
      },
      // 7. Campaign Stats - campaign performance metrics
      {
        name: 'view_campaign_stats',
        description: 'Display campaign statistics and performance metrics. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', description: 'Campaign ID to display stats for' }
          },
          required: ['campaignId']
        },
        _meta: {
          ui: { resourceUri: 'ui://ghl/campaign-stats' }
        }
      },
      // 8. Agent Stats - agent/user performance
      {
        name: 'view_agent_stats',
        description: 'Display agent/user performance statistics and metrics. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User/Agent ID to display stats for' },
            dateRange: { type: 'string', description: 'Date range (e.g., "last7days", "last30days")' }
          }
        },
        _meta: {
          ui: { resourceUri: 'ui://ghl/agent-stats' }
        }
      },
      // 9. Contact Timeline - activity history for a contact
      {
        name: 'view_contact_timeline',
        description: 'Display a contact\'s activity timeline with all interactions. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID to display timeline for' }
          },
          required: ['contactId']
        },
        _meta: {
          ui: { resourceUri: 'ui://ghl/contact-timeline' }
        }
      },
      // 10. Workflow Status - workflow execution status
      {
        name: 'view_workflow_status',
        description: 'Display workflow execution status and history. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string', description: 'Workflow ID to display status for' }
          },
          required: ['workflowId']
        },
        _meta: {
          ui: { resourceUri: 'ui://ghl/workflow-status' }
        }
      },
      // 11. MCP App - generic/main dashboard
      {
        name: 'view_dashboard',
        description: 'Display the main GHL dashboard overview. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        _meta: {
          ui: { resourceUri: 'ui://ghl/mcp-app' }
        }
      },
      // 12. Update Opportunity - action tool for UI to update opportunities
      {
        name: 'update_opportunity',
        description: 'Update an opportunity (move to stage, change value, status, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            opportunityId: { type: 'string', description: 'Opportunity ID to update' },
            pipelineStageId: { type: 'string', description: 'New stage ID (for moving)' },
            name: { type: 'string', description: 'Opportunity name' },
            monetaryValue: { type: 'number', description: 'Monetary value' },
            status: { type: 'string', enum: ['open', 'won', 'lost', 'abandoned'], description: 'Opportunity status' }
          },
          required: ['opportunityId']
        }
      }
    ];
  }

  /**
   * Get app tool names for routing
   */
  getAppToolNames(): string[] {
    return [
      'view_contact_grid',
      'view_pipeline_board',
      'view_quick_book',
      'view_opportunity_card',
      'view_calendar',
      'view_invoice',
      'view_campaign_stats',
      'view_agent_stats',
      'view_contact_timeline',
      'view_workflow_status',
      'view_dashboard',
      'update_opportunity'
    ];
  }

  /**
   * Check if a tool is an app tool
   */
  isAppTool(toolName: string): boolean {
    return this.getAppToolNames().includes(toolName);
  }

  /**
   * Execute an app tool
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<AppToolResult> {
    process.stderr.write(`[MCP Apps] Executing app tool: ${toolName}\n`);

    switch (toolName) {
      case 'view_contact_grid':
        return await this.viewContactGrid(args.query, args.limit);
      case 'view_pipeline_board':
        return await this.viewPipelineBoard(args.pipelineId);
      case 'view_quick_book':
        return await this.viewQuickBook(args.calendarId, args.contactId);
      case 'view_opportunity_card':
        return await this.viewOpportunityCard(args.opportunityId);
      case 'view_calendar':
        return await this.viewCalendar(args.calendarId, args.startDate, args.endDate);
      case 'view_invoice':
        return await this.viewInvoice(args.invoiceId);
      case 'view_campaign_stats':
        return await this.viewCampaignStats(args.campaignId);
      case 'view_agent_stats':
        return await this.viewAgentStats(args.userId, args.dateRange);
      case 'view_contact_timeline':
        return await this.viewContactTimeline(args.contactId);
      case 'view_workflow_status':
        return await this.viewWorkflowStatus(args.workflowId);
      case 'view_dashboard':
        return await this.viewDashboard();
      case 'update_opportunity':
        return await this.updateOpportunity(args as {
          opportunityId: string;
          pipelineStageId?: string;
          name?: string;
          monetaryValue?: number;
          status?: 'open' | 'won' | 'lost' | 'abandoned';
        });
      default:
        throw new Error(`Unknown app tool: ${toolName}`);
    }
  }

  /**
   * View contact grid (search results)
   */
  private async viewContactGrid(query?: string, limit?: number): Promise<AppToolResult> {
    const response = await this.ghlClient.searchContacts({
      locationId: this.ghlClient.getConfig().locationId,
      query: query,
      limit: limit || 25
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to search contacts');
    }

    const data = response.data;
    const resourceHandler = this.resourceHandlers.get('ui://ghl/contact-grid')!;

    return this.createAppResult(
      `Found ${data?.contacts?.length || 0} contacts`,
      resourceHandler.uri,
      resourceHandler.mimeType,
      resourceHandler.getContent(),
      data
    );
  }

  /**
   * View pipeline board (Kanban)
   */
  private async viewPipelineBoard(pipelineId: string): Promise<AppToolResult> {
    const [pipelinesResponse, opportunitiesResponse] = await Promise.all([
      this.ghlClient.getPipelines(),
      this.ghlClient.searchOpportunities({
        location_id: this.ghlClient.getConfig().locationId,
        pipeline_id: pipelineId
      })
    ]);

    if (!pipelinesResponse.success) {
      throw new Error(pipelinesResponse.error?.message || 'Failed to get pipeline');
    }

    const pipeline = pipelinesResponse.data?.pipelines?.find((p: any) => p.id === pipelineId);
    const opportunities = opportunitiesResponse.data?.opportunities || [];

    // Simplify opportunity data to only include fields the UI needs (reduces payload size)
    const simplifiedOpportunities = opportunities.map((opp: any) => ({
      id: opp.id,
      name: opp.name || 'Untitled',
      pipelineStageId: opp.pipelineStageId,
      status: opp.status || 'open',
      monetaryValue: opp.monetaryValue || 0,
      contact: opp.contact ? {
        name: opp.contact.name || 'Unknown',
        email: opp.contact.email,
        phone: opp.contact.phone
      } : { name: 'Unknown' },
      updatedAt: opp.updatedAt || opp.createdAt,
      createdAt: opp.createdAt,
      source: opp.source
    }));

    const data = {
      pipeline,
      opportunities: simplifiedOpportunities,
      stages: pipeline?.stages || []
    };

    const resourceHandler = this.resourceHandlers.get('ui://ghl/pipeline-board')!;

    return this.createAppResult(
      `Pipeline: ${pipeline?.name || 'Unknown'} (${opportunities.length} opportunities)`,
      resourceHandler.uri,
      resourceHandler.mimeType,
      resourceHandler.getContent(),
      data
    );
  }

  /**
   * View quick book interface
   */
  private async viewQuickBook(calendarId: string, contactId?: string): Promise<AppToolResult> {
    const [calendarResponse, contactResponse] = await Promise.all([
      this.ghlClient.getCalendar(calendarId),
      contactId ? this.ghlClient.getContact(contactId) : Promise.resolve({ success: true, data: null })
    ]);

    if (!calendarResponse.success) {
      throw new Error(calendarResponse.error?.message || 'Failed to get calendar');
    }

    const data = {
      calendar: calendarResponse.data,
      contact: contactResponse.data,
      locationId: this.ghlClient.getConfig().locationId
    };

    const resourceHandler = this.resourceHandlers.get('ui://ghl/quick-book')!;

    return this.createAppResult(
      `Quick booking for calendar: ${(calendarResponse.data as any)?.name || calendarId}`,
      resourceHandler.uri,
      resourceHandler.mimeType,
      resourceHandler.getContent(),
      data
    );
  }

  /**
   * View opportunity card
   */
  private async viewOpportunityCard(opportunityId: string): Promise<AppToolResult> {
    const response = await this.ghlClient.getOpportunity(opportunityId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get opportunity');
    }

    const opportunity = response.data;
    const resourceHandler = this.resourceHandlers.get('ui://ghl/opportunity-card')!;

    return this.createAppResult(
      `Opportunity: ${(opportunity as any)?.name || opportunityId}`,
      resourceHandler.uri,
      resourceHandler.mimeType,
      resourceHandler.getContent(),
      opportunity
    );
  }

  /**
   * View calendar
   */
  private async viewCalendar(calendarId: string, startDate?: string, endDate?: string): Promise<AppToolResult> {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const [calendarResponse, eventsResponse] = await Promise.all([
      this.ghlClient.getCalendar(calendarId),
      this.ghlClient.getCalendarEvents({
        calendarId: calendarId,
        startTime: start,
        endTime: end,
        locationId: this.ghlClient.getConfig().locationId
      })
    ]);

    if (!calendarResponse.success) {
      throw new Error(calendarResponse.error?.message || 'Failed to get calendar');
    }

    const calendar = calendarResponse.data as any;
    const data = {
      calendar: calendarResponse.data,
      events: eventsResponse.data?.events || [],
      startDate: start,
      endDate: end
    };

    const resourceHandler = this.resourceHandlers.get('ui://ghl/calendar-view')!;

    return this.createAppResult(
      `Calendar: ${calendar?.name || 'Unknown'} (${data.events.length} events)`,
      resourceHandler.uri,
      resourceHandler.mimeType,
      resourceHandler.getContent(),
      data
    );
  }

  /**
   * View campaign stats
   */
  private async viewCampaignStats(campaignId: string): Promise<AppToolResult> {
    // Get email campaigns
    const response = await this.ghlClient.getEmailCampaigns({});

    const campaigns = response.data?.schedules || [];
    const campaign = campaigns.find((c: any) => c.id === campaignId) || { id: campaignId };

    const data = {
      campaign,
      campaigns,
      campaignId,
      locationId: this.ghlClient.getConfig().locationId
    };

    const resourceHandler = this.resourceHandlers.get('ui://ghl/campaign-stats')!;

    return this.createAppResult(
      `Campaign stats: ${(campaign as any)?.name || campaignId}`,
      resourceHandler.uri,
      resourceHandler.mimeType,
      resourceHandler.getContent(),
      data
    );
  }

  /**
   * View agent stats
   */
  private async viewAgentStats(userId?: string, dateRange?: string): Promise<AppToolResult> {
    // Get location info which may include user data
    const locationResponse = await this.ghlClient.getLocationById(this.ghlClient.getConfig().locationId);

    const data = {
      userId,
      dateRange: dateRange || 'last30days',
      location: locationResponse.data,
      locationId: this.ghlClient.getConfig().locationId
    };

    const resourceHandler = this.resourceHandlers.get('ui://ghl/agent-stats')!;

    return this.createAppResult(
      userId ? `Agent stats: ${userId}` : 'Agent overview',
      resourceHandler.uri,
      resourceHandler.mimeType,
      resourceHandler.getContent(),
      data
    );
  }

  /**
   * View contact timeline
   */
  private async viewContactTimeline(contactId: string): Promise<AppToolResult> {
    const [contactResponse, notesResponse, tasksResponse] = await Promise.all([
      this.ghlClient.getContact(contactId),
      this.ghlClient.getContactNotes(contactId),
      this.ghlClient.getContactTasks(contactId)
    ]);

    if (!contactResponse.success) {
      throw new Error(contactResponse.error?.message || 'Failed to get contact');
    }

    const contact = contactResponse.data as any;
    const data = {
      contact: contactResponse.data,
      notes: notesResponse.data || [],
      tasks: tasksResponse.data || []
    };

    const resourceHandler = this.resourceHandlers.get('ui://ghl/contact-timeline')!;

    return this.createAppResult(
      `Timeline for ${contact?.firstName || ''} ${contact?.lastName || ''}`,
      resourceHandler.uri,
      resourceHandler.mimeType,
      resourceHandler.getContent(),
      data
    );
  }

  /**
   * View workflow status
   */
  private async viewWorkflowStatus(workflowId: string): Promise<AppToolResult> {
    const response = await this.ghlClient.getWorkflows({
      locationId: this.ghlClient.getConfig().locationId
    });

    const workflows = response.data?.workflows || [];
    const workflow = workflows.find((w: any) => w.id === workflowId) || { id: workflowId };

    const data = {
      workflow,
      workflows,
      workflowId,
      locationId: this.ghlClient.getConfig().locationId
    };

    const resourceHandler = this.resourceHandlers.get('ui://ghl/workflow-status')!;

    return this.createAppResult(
      `Workflow: ${(workflow as any)?.name || workflowId}`,
      resourceHandler.uri,
      resourceHandler.mimeType,
      resourceHandler.getContent(),
      data
    );
  }

  /**
   * View main dashboard
   */
  private async viewDashboard(): Promise<AppToolResult> {
    const [contactsResponse, pipelinesResponse, calendarsResponse] = await Promise.all([
      this.ghlClient.searchContacts({ locationId: this.ghlClient.getConfig().locationId, limit: 10 }),
      this.ghlClient.getPipelines(),
      this.ghlClient.getCalendars()
    ]);

    const data = {
      recentContacts: contactsResponse.data?.contacts || [],
      pipelines: pipelinesResponse.data?.pipelines || [],
      calendars: calendarsResponse.data?.calendars || [],
      locationId: this.ghlClient.getConfig().locationId
    };

    const resourceHandler = this.resourceHandlers.get('ui://ghl/mcp-app')!;

    return this.createAppResult(
      'GHL Dashboard Overview',
      resourceHandler.uri,
      resourceHandler.mimeType,
      resourceHandler.getContent(),
      data
    );
  }

  /**
   * View invoice
   */
  private async viewInvoice(invoiceId: string): Promise<AppToolResult> {
    const response = await this.ghlClient.getInvoice(invoiceId, {
      altId: this.ghlClient.getConfig().locationId,
      altType: 'location'
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get invoice');
    }

    const invoice = response.data;
    const resourceHandler = this.resourceHandlers.get('ui://ghl/invoice-preview')!;

    return this.createAppResult(
      `Invoice #${invoice?.invoiceNumber || invoiceId} - ${invoice?.status || 'Unknown status'}`,
      resourceHandler.uri,
      resourceHandler.mimeType,
      resourceHandler.getContent(),
      invoice
    );
  }

  /**
   * Update opportunity (action tool for UI)
   */
  private async updateOpportunity(args: {
    opportunityId: string;
    pipelineStageId?: string;
    name?: string;
    monetaryValue?: number;
    status?: 'open' | 'won' | 'lost' | 'abandoned';
  }): Promise<AppToolResult> {
    const { opportunityId, ...updates } = args;

    // Build the update payload
    const updatePayload: any = {};
    if (updates.pipelineStageId) updatePayload.pipelineStageId = updates.pipelineStageId;
    if (updates.name) updatePayload.name = updates.name;
    if (updates.monetaryValue !== undefined) updatePayload.monetaryValue = updates.monetaryValue;
    if (updates.status) updatePayload.status = updates.status;

    process.stderr.write(`[MCP Apps] Updating opportunity ${opportunityId}: ${JSON.stringify(updatePayload)}\n`);

    const response = await this.ghlClient.updateOpportunity(opportunityId, updatePayload);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to update opportunity');
    }

    const opportunity = response.data;

    return {
      content: [{ type: 'text', text: `Updated opportunity: ${opportunity?.name || opportunityId}` }],
      structuredContent: {
        success: true,
        opportunity: {
          id: opportunity?.id,
          name: opportunity?.name,
          pipelineStageId: opportunity?.pipelineStageId,
          monetaryValue: opportunity?.monetaryValue,
          status: opportunity?.status
        }
      }
    };
  }

  /**
   * Create app tool result with structuredContent
   */
  private createAppResult(
    textSummary: string,
    resourceUri: string,
    mimeType: string,
    htmlContent: string,
    data: any
  ): AppToolResult {
    // structuredContent is the data object that gets passed to ontoolresult
    // The UI accesses it via result.structuredContent
    return {
      content: [{ type: 'text', text: textSummary }],
      structuredContent: data
    };
  }

  /**
   * Inject data into HTML as a script tag
   */
  private injectDataIntoHTML(html: string, data: any): string {
    const dataScript = `<script>window.__MCP_APP_DATA__ = ${JSON.stringify(data)};</script>`;

    // Insert before </head> or at the beginning of <body>
    if (html.includes('</head>')) {
      return html.replace('</head>', `${dataScript}</head>`);
    } else if (html.includes('<body>')) {
      return html.replace('<body>', `<body>${dataScript}`);
    } else {
      return dataScript + html;
    }
  }

  /**
   * Get resource handler by URI
   */
  getResourceHandler(uri: string): AppResourceHandler | undefined {
    return this.resourceHandlers.get(uri);
  }

  /**
   * Get all registered resource URIs
   */
  getResourceURIs(): string[] {
    return Array.from(this.resourceHandlers.keys());
  }
}

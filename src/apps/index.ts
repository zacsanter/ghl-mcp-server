/**
 * MCP Apps Manager — Universal Renderer Architecture
 *
 * All views route through ONE universal renderer HTML file that takes a JSON UITree.
 * Pre-made templates provide deterministic views for the 11 standard tools.
 * The generate_ghl_view tool uses Claude to create novel views on the fly.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GHLApiClient } from '../clients/ghl-api-client.js';
import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { UITree, validateUITree } from './types.js';
import {
  buildContactGridTree,
  buildPipelineBoardTree,
  buildQuickBookTree,
  buildOpportunityCardTree,
  buildCalendarViewTree,
  buildInvoicePreviewTree,
  buildCampaignStatsTree,
  buildAgentStatsTree,
  buildContactTimelineTree,
  buildWorkflowStatusTree,
  buildDashboardTree,
} from './templates/index.js';

// ─── Catalog System Prompt (source of truth for components) ──

const CATALOG_SYSTEM_PROMPT = `You are a UI generator for GoHighLevel (GHL) CRM applications.
You generate JSON UI trees using the component catalog below. Your output MUST be valid JSON matching the UITree schema.

## RULES
1. Only use components defined in the catalog
2. Every element must have a unique "key", a "type" (matching a catalog component), and "props"
3. Parent elements list children by key in their "children" array
4. **USE THE PROVIDED GHL DATA** — if real data is included below, you MUST use it. Do NOT invent fake data when real data is available.
5. Keep layouts information-dense and professional
6. Respond with ONLY the JSON object. No markdown fences, no explanation.

## LAYOUT RULES (CRITICAL)
- Design for a **single viewport** — the view should fit on one screen without scrolling
- Maximum **15 elements** total in the tree. Fewer is better.
- Use **SplitLayout** for side-by-side content, not stacked cards that go off-screen
- Use **StatsGrid** with 3-4 MetricCards max for KPIs — don't list every metric
- For tables, limit to **10 rows max**. Show most relevant data, not everything.
- For KanbanBoard, limit to **5 columns** and **4 cards per column** max
- Prefer compact components: MetricCard, StatusBadge, KeyValueList over verbose layouts
- ONE PageHeader max. Don't nest sections inside sections.
- Think **dashboard widget**, not **full report page**

## UI TREE FORMAT
{
  "root": "<key of root element>",
  "elements": {
    "<key>": {
      "key": "<same key>",
      "type": "<ComponentName>",
      "props": { ... },
      "children": ["<child-key-1>", "<child-key-2>"]
    }
  }
}

## COMPONENT CATALOG

### PageHeader
Top-level page header with title, subtitle, status badge, and summary stats.
Props: title (string, required), subtitle (string?), status (string?), statusVariant ("active"|"complete"|"paused"|"draft"|"error"|"sent"|"paid"|"pending"?), gradient (boolean?), stats (array of {label, value}?)
Can contain children.

### Card
Container card with optional header and padding.
Props: title (string?), subtitle (string?), padding ("none"|"sm"|"md"|"lg"?), noBorder (boolean?)
Can contain children.

### StatsGrid
Grid of metric cards showing key numbers.
Props: columns (number?)
Can contain children (typically MetricCard elements).

### SplitLayout
Two-column layout for side-by-side content.
Props: ratio ("50/50"|"33/67"|"67/33"?), gap ("sm"|"md"|"lg"?)
Can contain children (exactly 2 children for left/right).

### Section
Titled content section.
Props: title (string?), description (string?)
Can contain children.

### DataTable
Sortable data table with column definitions and row actions.
Props: columns (array of {key, label, sortable?, align?, format?, width?}), rows (array of objects), selectable (boolean?), rowAction (string?), emptyMessage (string?), pageSize (number?)
Format options: "text"|"email"|"phone"|"date"|"currency"|"tags"|"avatar"|"status"

### KanbanBoard
Kanban-style board with columns and cards. Used for pipeline views.
Props: columns (array of {id, title, count?, totalValue?, color?, cards: [{id, title, subtitle?, value?, status?, statusVariant?, date?, avatarInitials?}]})

### MetricCard
Single metric display with big number, label, and optional trend.
Props: label (string), value (string), format ("number"|"currency"|"percent"?), trend ("up"|"down"|"flat"?), trendValue (string?), color ("default"|"green"|"blue"|"purple"|"yellow"|"red"?)

### StatusBadge
Colored badge showing entity status.
Props: label (string), variant ("active"|"complete"|"paused"|"draft"|"error"|"sent"|"paid"|"pending"|"open"|"won"|"lost")

### Timeline
Chronological event list for activity feeds.
Props: events (array of {id, title, description?, timestamp, icon?, variant?})
Icon options: "email"|"phone"|"note"|"meeting"|"task"|"system"

### ProgressBar
Percentage bar with label and value.
Props: label (string), value (number), max (number?), color ("green"|"blue"|"purple"|"yellow"|"red"?), showPercent (boolean?), benchmark (number?), benchmarkLabel (string?)

### DetailHeader
Header for detail/preview pages with entity name, ID, status.
Props: title (string), subtitle (string?), entityId (string?), status (string?), statusVariant?
Can contain children.

### KeyValueList
List of label-value pairs for totals, metadata.
Props: items (array of {label, value, bold?, variant?, isTotalRow?}), compact (boolean?)
Variant options: "default"|"highlight"|"muted"|"success"|"danger"

### LineItemsTable
Invoice-style table with quantities and prices.
Props: items (array of {name, description?, quantity, unitPrice, total}), currency (string?)

### InfoBlock
Labeled block of information (e.g. From/To on invoices).
Props: label (string), name (string), lines (string[])

### SearchBar
Search input with placeholder.
Props: placeholder (string?), valuePath (string?)

### FilterChips
Toggleable filter tags.
Props: chips (array of {label, value, active?}), dataPath (string?)

### TabGroup
Tab navigation for switching views.
Props: tabs (array of {label, value, count?}), activeTab (string?), dataPath (string?)

### ActionButton
Clickable button with variants.
Props: label (string), variant ("primary"|"secondary"|"danger"|"ghost"?), size ("sm"|"md"|"lg"?), icon (string?), disabled (boolean?)

### ActionBar
Row of action buttons.
Props: align ("left"|"center"|"right"?)
Can contain children (ActionButton elements).

### CurrencyDisplay
Formatted monetary value with currency symbol and locale-aware formatting.
Props: amount (number, required), currency (string? default "USD"), locale (string? default "en-US"), size ("sm"|"md"|"lg"?), positive (boolean?), negative (boolean?)

### TagList
Visual tag/chip display for arrays of tags rendered as inline colored pills.
Props: tags (array of {label, color?, variant?} or strings, required), maxVisible (number?), size ("sm"|"md"?)

### CardGrid
Grid of visual cards with image, title, description for browsable catalogs and listings.
Props: cards (array of {title, description?, imageUrl?, subtitle?, status?, statusVariant?, action?}, required), columns (number? default 3)

### AvatarGroup
Stacked circular avatars for displaying users, followers, or team members.
Props: avatars (array of {name, imageUrl?, initials?}, required), max (number? default 5), size ("sm"|"md"|"lg"?)

### StarRating
Visual star rating display (1-5).
Props: rating (number, required), count (number?), maxStars (number? default 5), distribution (array of {stars, count}?), showDistribution (boolean?)

### StockIndicator
Visual stock level indicator showing green/yellow/red status with quantity.
Props: quantity (number, required), lowThreshold (number?), criticalThreshold (number?), label (string?)

### ChatThread
Conversation message thread with chat bubbles.
Props: messages (array of {id, content, direction: "inbound"|"outbound", type?, timestamp, senderName?, avatar?}), title (string?)

### EmailPreview
Rendered HTML email with header info in a bordered container.
Props: from (string), to (string), subject (string), date (string), body (string), cc (string?), attachments (array of {name, size}?)

### ContentPreview
Rich text/HTML content preview (sanitized).
Props: content (string), format ("html"|"markdown"|"text"?), maxHeight (number?), title (string?)

### TranscriptView
Time-stamped conversation transcript with speaker labels.
Props: entries (array of {timestamp, speaker, text, speakerRole?}), title (string?), duration (string?)

### AudioPlayer
Visual audio player UI with play button and waveform visualization.
Props: src (string?), title (string?), duration (string?), type ("recording"|"voicemail"?)

### ChecklistView
Task/checklist with checkboxes, due dates, assignees, and priority indicators.
Props: items (array of {id, title, completed?, dueDate?, assignee?, priority?}), title (string?), showProgress (boolean?)

### CalendarView
Monthly calendar grid with color-coded event blocks.
Props: year (number?), month (number?), events (array of {date, title, time?, color?, type?}), highlightToday (boolean?), title (string?)

### FlowDiagram
Linear node→arrow→node flow for triggers, IVR menus, funnel pages.
Props: nodes (array of {id, label, type?, description?}), edges (array of {from, to, label?}), direction ("horizontal"|"vertical"?), title (string?)

### TreeView
Hierarchical expandable tree.
Props: nodes (array of {id, label, icon?, children?, expanded?, badge?}), title (string?), expandAll (boolean?)

### MediaGallery
Thumbnail grid for images/files.
Props: items (array of {url, thumbnailUrl?, title?, fileType?, fileSize?, date?}), columns (number?), title (string?)

### DuplicateCompare
Side-by-side record comparison with field-level diff highlighting.
Props: records (array of {label, fields: Record<string, string>} — exactly 2), highlightDiffs (boolean?), title (string?)

### BarChart
Vertical or horizontal bar chart.
Props: bars (array of {label, value, color?}), orientation ("vertical"|"horizontal"?), maxValue (number?), showValues (boolean?), title (string?)

### LineChart
Time-series line chart with optional area fill.
Props: points (array of {label, value}), color (string?), showPoints (boolean?), showArea (boolean?), title (string?), yAxisLabel (string?)

### PieChart
Pie or donut chart for proportional breakdowns.
Props: segments (array of {label, value, color?}), donut (boolean?), title (string?), showLegend (boolean?)

### FunnelChart
Horizontal funnel showing stage drop-off.
Props: stages (array of {label, value, color?}), showDropoff (boolean?), title (string?)

### SparklineChart
Tiny inline chart.
Props: values (number[]), color (string?), height (number?), width (number?)

### ContactPicker
Searchable contact dropdown.
Props: searchTool (string, required), placeholder (string?), value (any?)

### InvoiceBuilder
Multi-section invoice form.
Props: createTool (string?), contactSearchTool (string?), initialContact (any?), initialItems (array?)

### OpportunityEditor
Inline editor for deal/opportunity fields.
Props: saveTool (string, required), opportunity (object, required), stages (array of {id, name}?)

### AppointmentBooker
Calendar-based appointment booking form.
Props: calendarTool (string?), bookTool (string?), contactSearchTool (string?), calendarId (string?)

### EditableField
Click-to-edit wrapper for any text value.
Props: value (string, required), fieldName (string, required), saveTool (string?), saveArgs (object?)

### SelectDropdown
Dropdown select.
Props: loadTool (string?), loadArgs (object?), options (array of {label, value}?), value (string?), placeholder (string?)

### FormGroup
Group of form fields with labels and validation.
Props: fields (array of {key, label, type?, value?, required?, options?}, required), submitLabel (string?), submitTool (string?)

### AmountInput
Currency-formatted number input.
Props: value (number, required), currency (string?)

## DATA RULES (CRITICAL — READ CAREFULLY)
- If real GHL data is provided in the user message, use ONLY that data. Do NOT add, invent, or embellish any records.
- Pipeline stages MUST come from the provided data. Never invent stage names unless they literally exist in the data.
- Show exactly the records provided. If there are 2 opportunities, show 2. Don't add fake ones.
- If no data is provided, THEN you may use sample data, but keep it minimal (3-5 records max).
- When generating interactive views, use correct tool names for GHL:
  - ContactPicker: searchTool="search_contacts"
  - InvoiceBuilder: createTool="create_invoice", contactSearchTool="search_contacts"
  - OpportunityEditor: saveTool="update_opportunity"
  - KanbanBoard: moveTool="update_opportunity"`;

// ─── Types ──────────────────────────────────────────────────

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

// ─── UI Build Path Resolver ─────────────────────────────────

function getUIBuildPath(): string {
  const fromDist = path.resolve(__dirname, '..', 'app-ui');
  if (fs.existsSync(fromDist)) return fromDist;
  const appUiPath = path.join(process.cwd(), 'dist', 'app-ui');
  if (fs.existsSync(appUiPath)) return appUiPath;
  return fromDist;
}

// ─── MCP Apps Manager ──────────────────────────────────────

export class MCPAppsManager {
  private ghlClient: GHLApiClient;
  private resourceHandlers: Map<string, AppResourceHandler> = new Map();
  private uiBuildPath: string;
  private pendingDynamicData: any = null;
  /** Cached universal renderer HTML */
  private rendererHTML: string | null = null;

  constructor(ghlClient: GHLApiClient) {
    this.ghlClient = ghlClient;
    this.uiBuildPath = getUIBuildPath();
    process.stderr.write(`[MCP Apps] UI build path: ${this.uiBuildPath}\n`);
    this.registerResourceHandlers();
  }

  // ─── Resource Registration ──────────────────────────────

  private registerResourceHandlers(): void {
    // Universal renderer is the ONLY real resource
    // All view_* tools inject their UITree into this same renderer
    const universalResource = {
      uri: 'ui://ghl/app',
      mimeType: 'text/html;profile=mcp-app',
      getContent: () => {
        const html = this.getRendererHTML();
        if (this.pendingDynamicData) {
          const data = this.pendingDynamicData;
          this.pendingDynamicData = null;
          process.stderr.write(`[MCP Apps] Injecting UITree into universal renderer\n`);
          return this.injectDataIntoHTML(html, data);
        }
        return html;
      },
    };

    this.resourceHandlers.set('ui://ghl/app', universalResource);

    // Keep dynamic-view as an alias for backward compatibility
    this.resourceHandlers.set('ui://ghl/dynamic-view', {
      ...universalResource,
      uri: 'ui://ghl/dynamic-view',
    });

    // Legacy resource URIs — all point to the universal renderer
    const legacyURIs = [
      'ui://ghl/mcp-app',
      'ui://ghl/pipeline-board',
      'ui://ghl/quick-book',
      'ui://ghl/opportunity-card',
      'ui://ghl/contact-grid',
      'ui://ghl/calendar-view',
      'ui://ghl/invoice-preview',
      'ui://ghl/campaign-stats',
      'ui://ghl/agent-stats',
      'ui://ghl/contact-timeline',
      'ui://ghl/workflow-status',
    ];

    for (const uri of legacyURIs) {
      this.resourceHandlers.set(uri, {
        uri,
        mimeType: 'text/html;profile=mcp-app',
        getContent: universalResource.getContent,
      });
    }
  }

  /**
   * Load and cache the universal renderer HTML
   */
  private getRendererHTML(): string {
    if (this.rendererHTML) return this.rendererHTML;

    // Try universal-renderer first, fall back to dynamic-view
    for (const filename of ['universal-renderer.html', 'dynamic-view.html']) {
      const filePath = path.join(this.uiBuildPath, filename);
      try {
        this.rendererHTML = fs.readFileSync(filePath, 'utf-8');
        process.stderr.write(`[MCP Apps] Loaded universal renderer from ${filename}\n`);
        return this.rendererHTML;
      } catch {
        // Try next
      }
    }

    process.stderr.write(`[MCP Apps] WARNING: Universal renderer HTML not found, using fallback\n`);
    this.rendererHTML = this.getFallbackHTML();
    return this.rendererHTML;
  }

  private getFallbackHTML(): string {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>GHL View</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:20px}
.fallback{text-align:center;color:#666}</style></head>
<body><div class="fallback"><p>UI renderer is loading...</p><p>Run <code>npm run build:dynamic-ui</code> to build.</p></div>
<script>
window.addEventListener('message',(e)=>{if(e.data?.type==='mcp-app-init'){console.log('MCP App data:',e.data.data)}});
const d=window.__MCP_APP_DATA__;if(d){document.querySelector('.fallback').innerHTML='<pre>'+JSON.stringify(d,null,2)+'</pre>'}
</script></body></html>`;
  }

  // ─── Tool Definitions ───────────────────────────────────

  getToolDefinitions(): Tool[] {
    // All tools point to the universal renderer resource
    const appUri = 'ui://ghl/app';

    return [
      {
        name: 'view_contact_grid',
        description: 'Display contact search results in a data grid with sorting and pagination. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query string' },
            limit: { type: 'number', description: 'Maximum results (default: 25)' },
          },
        },
        _meta: { ui: { resourceUri: appUri } },
      },
      {
        name: 'view_pipeline_board',
        description: 'Display a pipeline as an interactive Kanban board with opportunities. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            pipelineId: { type: 'string', description: 'Pipeline ID to display' },
          },
          required: ['pipelineId'],
        },
        _meta: { ui: { resourceUri: appUri } },
      },
      {
        name: 'view_quick_book',
        description: 'Display a quick booking interface for scheduling appointments. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID for booking' },
            contactId: { type: 'string', description: 'Optional contact ID to pre-fill' },
          },
          required: ['calendarId'],
        },
        _meta: { ui: { resourceUri: appUri } },
      },
      {
        name: 'view_opportunity_card',
        description: 'Display a single opportunity with details, value, and stage info. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            opportunityId: { type: 'string', description: 'Opportunity ID to display' },
          },
          required: ['opportunityId'],
        },
        _meta: { ui: { resourceUri: appUri } },
      },
      {
        name: 'view_calendar',
        description: 'Display a calendar with events and appointments. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID to display' },
            startDate: { type: 'string', description: 'Start date (ISO format)' },
            endDate: { type: 'string', description: 'End date (ISO format)' },
          },
          required: ['calendarId'],
        },
        _meta: { ui: { resourceUri: appUri } },
      },
      {
        name: 'view_invoice',
        description: 'Display an invoice preview with line items and payment status. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            invoiceId: { type: 'string', description: 'Invoice ID to display' },
          },
          required: ['invoiceId'],
        },
        _meta: { ui: { resourceUri: appUri } },
      },
      {
        name: 'view_campaign_stats',
        description: 'Display campaign statistics and performance metrics. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', description: 'Campaign ID to display stats for' },
          },
          required: ['campaignId'],
        },
        _meta: { ui: { resourceUri: appUri } },
      },
      {
        name: 'view_agent_stats',
        description: 'Display agent/user performance statistics and metrics. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User/Agent ID to display stats for' },
            dateRange: { type: 'string', description: 'Date range (e.g., "last7days", "last30days")' },
          },
        },
        _meta: { ui: { resourceUri: appUri } },
      },
      {
        name: 'view_contact_timeline',
        description: "Display a contact's activity timeline with all interactions. Returns a visual UI component.",
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID to display timeline for' },
          },
          required: ['contactId'],
        },
        _meta: { ui: { resourceUri: appUri } },
      },
      {
        name: 'view_workflow_status',
        description: 'Display workflow execution status and history. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string', description: 'Workflow ID to display status for' },
          },
          required: ['workflowId'],
        },
        _meta: { ui: { resourceUri: appUri } },
      },
      {
        name: 'view_dashboard',
        description: 'Display the main GHL dashboard overview. Returns a visual UI component.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        _meta: { ui: { resourceUri: appUri } },
      },
      {
        name: 'generate_ghl_view',
        description: 'Generate a rich, AI-powered UI view on the fly from a natural language prompt. Optionally fetches real GHL data to populate the view. Returns a visual UI component rendered in the MCP App.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Natural language description of the UI view to generate.',
            },
            dataSource: {
              type: 'string',
              enum: ['contacts', 'opportunities', 'pipelines', 'calendars', 'invoices'],
              description: 'Optional: fetch real GHL data to include in the generated view.',
            },
          },
          required: ['prompt'],
        },
        _meta: { ui: { resourceUri: appUri } },
      },
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
            status: { type: 'string', enum: ['open', 'won', 'lost', 'abandoned'], description: 'Opportunity status' },
          },
          required: ['opportunityId'],
        },
      },
    ];
  }

  // ─── Tool Routing ───────────────────────────────────────

  getAppToolNames(): string[] {
    return [
      'view_contact_grid', 'view_pipeline_board', 'view_quick_book',
      'view_opportunity_card', 'view_calendar', 'view_invoice',
      'view_campaign_stats', 'view_agent_stats', 'view_contact_timeline',
      'view_workflow_status', 'view_dashboard', 'generate_ghl_view',
      'update_opportunity',
    ];
  }

  isAppTool(toolName: string): boolean {
    return this.getAppToolNames().includes(toolName);
  }

  async executeTool(toolName: string, args: Record<string, any>): Promise<AppToolResult> {
    process.stderr.write(`[MCP Apps] Executing: ${toolName}\n`);

    switch (toolName) {
      case 'view_contact_grid':
        return this.viewContactGrid(args.query, args.limit);
      case 'view_pipeline_board':
        return this.viewPipelineBoard(args.pipelineId);
      case 'view_quick_book':
        return this.viewQuickBook(args.calendarId, args.contactId);
      case 'view_opportunity_card':
        return this.viewOpportunityCard(args.opportunityId);
      case 'view_calendar':
        return this.viewCalendar(args.calendarId, args.startDate, args.endDate);
      case 'view_invoice':
        return this.viewInvoice(args.invoiceId);
      case 'view_campaign_stats':
        return this.viewCampaignStats(args.campaignId);
      case 'view_agent_stats':
        return this.viewAgentStats(args.userId, args.dateRange);
      case 'view_contact_timeline':
        return this.viewContactTimeline(args.contactId);
      case 'view_workflow_status':
        return this.viewWorkflowStatus(args.workflowId);
      case 'view_dashboard':
        return this.viewDashboard();
      case 'generate_ghl_view':
        return this.generateDynamicView(args.prompt, args.dataSource);
      case 'update_opportunity':
        return this.updateOpportunity(args as {
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

  // ─── View Handlers (fetch data → template → universal renderer) ──

  private async viewContactGrid(query?: string, limit?: number): Promise<AppToolResult> {
    const response = await this.ghlClient.searchContacts({
      locationId: this.ghlClient.getConfig().locationId,
      query, limit: limit || 25,
    });
    if (!response.success) throw new Error(response.error?.message || 'Failed to search contacts');

    const uiTree = buildContactGridTree({
      contacts: response.data?.contacts || [],
      query,
    });

    return this.renderUITree(uiTree, `Found ${response.data?.contacts?.length || 0} contacts`);
  }

  private async viewPipelineBoard(pipelineId: string): Promise<AppToolResult> {
    const [pipelinesResponse, opportunitiesResponse] = await Promise.all([
      this.ghlClient.getPipelines(),
      this.ghlClient.searchOpportunities({
        location_id: this.ghlClient.getConfig().locationId,
        pipeline_id: pipelineId,
      }),
    ]);
    if (!pipelinesResponse.success) throw new Error(pipelinesResponse.error?.message || 'Failed to get pipeline');

    const pipeline = pipelinesResponse.data?.pipelines?.find((p: any) => p.id === pipelineId);
    const opportunities = (opportunitiesResponse.data?.opportunities || []).map((opp: any) => ({
      id: opp.id, name: opp.name || 'Untitled',
      pipelineStageId: opp.pipelineStageId, status: opp.status || 'open',
      monetaryValue: opp.monetaryValue || 0,
      contact: opp.contact ? { name: opp.contact.name || 'Unknown', email: opp.contact.email, phone: opp.contact.phone } : { name: 'Unknown' },
      updatedAt: opp.updatedAt || opp.createdAt, createdAt: opp.createdAt, source: opp.source,
    }));

    const uiTree = buildPipelineBoardTree({
      pipeline, opportunities, stages: pipeline?.stages || [],
    });

    return this.renderUITree(uiTree, `Pipeline: ${pipeline?.name || 'Unknown'} (${opportunities.length} opportunities)`);
  }

  private async viewQuickBook(calendarId: string, contactId?: string): Promise<AppToolResult> {
    const [calendarResponse, contactResponse] = await Promise.all([
      this.ghlClient.getCalendar(calendarId),
      contactId ? this.ghlClient.getContact(contactId) : Promise.resolve({ success: true, data: null }),
    ]);
    if (!calendarResponse.success) throw new Error(calendarResponse.error?.message || 'Failed to get calendar');

    const uiTree = buildQuickBookTree({
      calendar: calendarResponse.data,
      contact: contactResponse.data,
      locationId: this.ghlClient.getConfig().locationId,
    });

    return this.renderUITree(uiTree, `Quick booking for calendar: ${(calendarResponse.data as any)?.name || calendarId}`);
  }

  private async viewOpportunityCard(opportunityId: string): Promise<AppToolResult> {
    const response = await this.ghlClient.getOpportunity(opportunityId);
    if (!response.success) throw new Error(response.error?.message || 'Failed to get opportunity');

    const uiTree = buildOpportunityCardTree(response.data);
    return this.renderUITree(uiTree, `Opportunity: ${(response.data as any)?.name || opportunityId}`);
  }

  private async viewCalendar(calendarId: string, startDate?: string, endDate?: string): Promise<AppToolResult> {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const [calendarResponse, eventsResponse] = await Promise.all([
      this.ghlClient.getCalendar(calendarId),
      this.ghlClient.getCalendarEvents({
        calendarId, startTime: start, endTime: end,
        locationId: this.ghlClient.getConfig().locationId,
      }),
    ]);
    if (!calendarResponse.success) throw new Error(calendarResponse.error?.message || 'Failed to get calendar');

    const calendar = calendarResponse.data as any;
    const events = eventsResponse.data?.events || [];

    const uiTree = buildCalendarViewTree({ calendar, events, startDate: start, endDate: end });
    return this.renderUITree(uiTree, `Calendar: ${calendar?.name || 'Unknown'} (${events.length} events)`);
  }

  private async viewInvoice(invoiceId: string): Promise<AppToolResult> {
    const response = await this.ghlClient.getInvoice(invoiceId, {
      altId: this.ghlClient.getConfig().locationId,
      altType: 'location',
    });
    if (!response.success) throw new Error(response.error?.message || 'Failed to get invoice');

    const invoice = response.data;
    const uiTree = buildInvoicePreviewTree(invoice);
    return this.renderUITree(uiTree, `Invoice #${invoice?.invoiceNumber || invoiceId} - ${invoice?.status || 'Unknown status'}`);
  }

  private async viewCampaignStats(campaignId: string): Promise<AppToolResult> {
    const response = await this.ghlClient.getEmailCampaigns({});
    const campaigns = response.data?.schedules || [];
    const campaign = campaigns.find((c: any) => c.id === campaignId) || { id: campaignId };

    const uiTree = buildCampaignStatsTree({
      campaign, campaigns, campaignId,
      locationId: this.ghlClient.getConfig().locationId,
    });

    return this.renderUITree(uiTree, `Campaign stats: ${(campaign as any)?.name || campaignId}`);
  }

  private async viewAgentStats(userId?: string, dateRange?: string): Promise<AppToolResult> {
    const locationResponse = await this.ghlClient.getLocationById(this.ghlClient.getConfig().locationId);

    const uiTree = buildAgentStatsTree({
      userId, dateRange: dateRange || 'last30days',
      location: locationResponse.data,
      locationId: this.ghlClient.getConfig().locationId,
    });

    return this.renderUITree(uiTree, userId ? `Agent stats: ${userId}` : 'Agent overview');
  }

  private async viewContactTimeline(contactId: string): Promise<AppToolResult> {
    const [contactResponse, notesResponse, tasksResponse] = await Promise.all([
      this.ghlClient.getContact(contactId),
      this.ghlClient.getContactNotes(contactId),
      this.ghlClient.getContactTasks(contactId),
    ]);
    if (!contactResponse.success) throw new Error(contactResponse.error?.message || 'Failed to get contact');

    const contact = contactResponse.data as any;
    const uiTree = buildContactTimelineTree({
      contact: contactResponse.data,
      notes: notesResponse.data || [],
      tasks: tasksResponse.data || [],
    });

    return this.renderUITree(uiTree, `Timeline for ${contact?.firstName || ''} ${contact?.lastName || ''}`);
  }

  private async viewWorkflowStatus(workflowId: string): Promise<AppToolResult> {
    const response = await this.ghlClient.getWorkflows({
      locationId: this.ghlClient.getConfig().locationId,
    });
    const workflows = response.data?.workflows || [];
    const workflow = workflows.find((w: any) => w.id === workflowId) || { id: workflowId };

    const uiTree = buildWorkflowStatusTree({
      workflow, workflows, workflowId,
      locationId: this.ghlClient.getConfig().locationId,
    });

    return this.renderUITree(uiTree, `Workflow: ${(workflow as any)?.name || workflowId}`);
  }

  private async viewDashboard(): Promise<AppToolResult> {
    const [contactsResponse, pipelinesResponse, calendarsResponse] = await Promise.all([
      this.ghlClient.searchContacts({ locationId: this.ghlClient.getConfig().locationId, limit: 10 }),
      this.ghlClient.getPipelines(),
      this.ghlClient.getCalendars(),
    ]);

    const uiTree = buildDashboardTree({
      recentContacts: contactsResponse.data?.contacts || [],
      pipelines: pipelinesResponse.data?.pipelines || [],
      calendars: calendarsResponse.data?.calendars || [],
      locationId: this.ghlClient.getConfig().locationId,
    });

    return this.renderUITree(uiTree, 'GHL Dashboard Overview');
  }

  // ─── Dynamic View (LLM-powered) ────────────────────────

  private detectDataSources(prompt: string): string[] {
    const lower = prompt.toLowerCase();
    const sources: string[] = [];
    if (lower.match(/pipeline|kanban|deal|opportunit|stage|funnel|sales/)) sources.push('pipelines');
    if (lower.match(/contact|lead|customer|people|person|client/)) sources.push('contacts');
    if (lower.match(/calendar|appointment|event|schedule|booking/)) sources.push('calendars');
    if (lower.match(/invoice|billing|payment|charge/)) sources.push('invoices');
    if (lower.match(/campaign|email.*market|newsletter|broadcast/)) sources.push('campaigns');
    if (sources.length === 0) sources.push('contacts', 'pipelines');
    return sources;
  }

  private async generateDynamicView(prompt: string, dataSource?: string): Promise<AppToolResult> {
    process.stderr.write(`[MCP Apps] Generating dynamic view: "${prompt}" (dataSource: ${dataSource || 'auto'})\n`);

    // Step 1: Fetch real GHL data
    let ghlData: any = {};
    const sources = dataSource ? [dataSource] : this.detectDataSources(prompt);

    for (const src of sources) {
      try {
        const data = await this.fetchGHLData(src);
        if (data) Object.assign(ghlData, data);
      } catch (err: any) {
        process.stderr.write(`[MCP Apps] Warning: Failed to fetch GHL data for ${src}: ${err.message}\n`);
      }
    }
    if (Object.keys(ghlData).length === 0) ghlData = null;

    // Step 2: Call Claude API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is required for generate_ghl_view');

    const anthropic = new Anthropic({ apiKey });

    let userMessage: string;
    if (ghlData) {
      const dataKeys = Object.keys(ghlData);
      const summary: string[] = [];
      if (ghlData.pipelines) summary.push(`${ghlData.pipelines.length} pipeline(s)`);
      if (ghlData.opportunities) summary.push(`${ghlData.opportunities.length} opportunity/deal(s)`);
      if (ghlData.contacts) summary.push(`${ghlData.contacts.length} contact(s)`);
      if (ghlData.calendars) summary.push(`${ghlData.calendars.length} calendar(s)`);
      if (ghlData.invoices) summary.push(`${ghlData.invoices.length} invoice(s)`);
      if (ghlData.campaigns) summary.push(`${ghlData.campaigns.length} campaign(s)`);

      userMessage = `${prompt}

⛔ STRICT DATA RULES:
- You have REAL CRM data below: ${summary.join(', ')}
- Use ONLY this data. Do NOT invent ANY additional records.
- If pipelines are provided, use ONLY the stage names from pipelines[].stages[].name.
- Show exactly the records provided.
- Do NOT add sections for data types not provided (${['tasks', 'workflows', 'notes', 'emails'].filter(k => !dataKeys.includes(k)).join(', ')} were NOT fetched).

REAL GHL DATA:
\`\`\`json
${JSON.stringify(ghlData, null, 2)}
\`\`\``;
    } else {
      userMessage = `${prompt}\n\n(No real data available — use minimal sample data, 3-5 records max.)`;
    }

    let message;
    try {
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: CATALOG_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });
    } catch (aiErr: any) {
      throw new Error(`AI generation failed: ${aiErr.message}`);
    }

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    const cleaned = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();

    let uiTree: UITree;
    try {
      uiTree = JSON.parse(cleaned);
    } catch (parseErr: any) {
      throw new Error(`Failed to parse AI response as JSON: ${parseErr.message}`);
    }

    // Validate the tree
    const errors = validateUITree(uiTree);
    if (errors.length > 0) {
      process.stderr.write(`[MCP Apps] UITree validation warnings: ${JSON.stringify(errors)}\n`);
      // Don't throw — render what we got, the renderer handles unknown types gracefully
    }

    process.stderr.write(`[MCP Apps] Generated UI tree with ${Object.keys(uiTree.elements).length} elements\n`);

    return this.renderUITree(uiTree, `Generated dynamic view: ${prompt}`);
  }

  // ─── Data Fetching ──────────────────────────────────────

  private async fetchGHLData(dataSource: string): Promise<any> {
    const locationId = this.ghlClient.getConfig().locationId;

    switch (dataSource) {
      case 'contacts': {
        const resp = await this.ghlClient.searchContacts({ locationId, limit: 20 });
        return { contacts: resp.data?.contacts || [] };
      }
      case 'opportunities': {
        const resp = await this.ghlClient.searchOpportunities({ location_id: locationId });
        return { opportunities: resp.data?.opportunities || [] };
      }
      case 'pipelines': {
        const [pResp, oResp] = await Promise.all([
          this.ghlClient.getPipelines(),
          this.ghlClient.searchOpportunities({ location_id: locationId }),
        ]);
        return {
          pipelines: pResp.data?.pipelines || [],
          opportunities: oResp.data?.opportunities || [],
        };
      }
      case 'calendars': {
        const resp = await this.ghlClient.getCalendars();
        return { calendars: resp.data?.calendars || [] };
      }
      case 'invoices': {
        const resp = await this.ghlClient.listInvoices?.({
          altId: locationId, altType: 'location', limit: '10', offset: '0',
        }) || { data: { invoices: [] } };
        return { invoices: resp.data?.invoices || [] };
      }
      case 'campaigns': {
        const resp = await this.ghlClient.getEmailCampaigns({});
        return { campaigns: resp.data?.schedules || [] };
      }
      default:
        return null;
    }
  }

  // ─── Action Tools ───────────────────────────────────────

  private async updateOpportunity(args: {
    opportunityId: string;
    pipelineStageId?: string;
    name?: string;
    monetaryValue?: number;
    status?: 'open' | 'won' | 'lost' | 'abandoned';
  }): Promise<AppToolResult> {
    const { opportunityId, ...updates } = args;
    const updatePayload: any = {};
    if (updates.pipelineStageId) updatePayload.pipelineStageId = updates.pipelineStageId;
    if (updates.name) updatePayload.name = updates.name;
    if (updates.monetaryValue !== undefined) updatePayload.monetaryValue = updates.monetaryValue;
    if (updates.status) updatePayload.status = updates.status;

    process.stderr.write(`[MCP Apps] Updating opportunity ${opportunityId}: ${JSON.stringify(updatePayload)}\n`);
    const response = await this.ghlClient.updateOpportunity(opportunityId, updatePayload);
    if (!response.success) throw new Error(response.error?.message || 'Failed to update opportunity');

    const opportunity = response.data;
    return {
      content: [{ type: 'text', text: `Updated opportunity: ${opportunity?.name || opportunityId}` }],
      structuredContent: {
        success: true,
        opportunity: {
          id: opportunity?.id, name: opportunity?.name,
          pipelineStageId: opportunity?.pipelineStageId,
          monetaryValue: opportunity?.monetaryValue, status: opportunity?.status,
        },
      },
    };
  }

  // ─── Universal Render Pipeline ──────────────────────────

  /**
   * Core render method: takes a UITree, injects it into the universal
   * renderer, and returns a structuredContent result.
   */
  private renderUITree(uiTree: UITree, textSummary: string): AppToolResult {
    // Store UITree for injection when resource is read
    this.pendingDynamicData = { uiTree };

    return {
      content: [{ type: 'text', text: textSummary }],
      structuredContent: { uiTree } as Record<string, unknown>,
    };
  }

  /**
   * Inject data into HTML as a script tag (for pre-injected __MCP_APP_DATA__)
   */
  private injectDataIntoHTML(html: string, data: any): string {
    const dataScript = `<script>window.__MCP_APP_DATA__ = ${JSON.stringify(data)};</script>`;
    if (html.includes('</head>')) {
      return html.replace('</head>', `${dataScript}</head>`);
    } else if (html.includes('<body>')) {
      return html.replace('<body>', `<body>${dataScript}`);
    }
    return dataScript + html;
  }

  // ─── Resource Access ────────────────────────────────────

  getResourceHandler(uri: string): AppResourceHandler | undefined {
    return this.resourceHandlers.get(uri);
  }

  getResourceURIs(): string[] {
    return Array.from(this.resourceHandlers.keys());
  }
}

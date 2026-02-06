/**
 * GoHighLevel Forms Tools
 * Tools for managing forms and form submissions
 */

import { GHLApiClient } from '../clients/ghl-api-client.js';

export class FormsTools {
  constructor(private ghlClient: GHLApiClient) {}

  getToolDefinitions() {
    return [
      {
        name: 'get_forms',
        description: 'Get all forms for a location. Forms are used to collect leads and information from contacts.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of forms to return (default: 20, max: 100)'
            },
            type: {
              type: 'string',
              description: 'Filter by form type (e.g., "form", "survey")'
            }
          }
        },
        _meta: {
          labels: {
            category: "forms",
            access: "read",
            complexity: "simple"
          }
        }
      },
      {
        name: 'get_form_submissions',
        description: 'Get all submissions for a specific form. Returns lead data collected through the form.',
        inputSchema: {
          type: 'object',
          properties: {
            formId: {
              type: 'string',
              description: 'Form ID to get submissions for'
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            },
            startAt: {
              type: 'string',
              description: 'Start date for filtering submissions (ISO 8601 format)'
            },
            endAt: {
              type: 'string',
              description: 'End date for filtering submissions (ISO 8601 format)'
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of submissions to return (default: 20, max: 100)'
            },
            page: {
              type: 'number',
              description: 'Page number for pagination'
            },
        _meta: {
          labels: {
            category: "forms",
            access: "read",
            complexity: "simple"
          }
        }
          },
          required: ['formId']
        }
      },
      {
        name: 'get_form_by_id',
        description: 'Get a specific form by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            formId: {
              type: 'string',
              description: 'The form ID to retrieve'
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            },
        _meta: {
          labels: {
            category: "forms",
            access: "read",
            complexity: "simple"
          }
        }
          },
          required: ['formId']
        }
      }
    ];
  }

  async handleToolCall(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const config = this.ghlClient.getConfig();
    const locationId = (args.locationId as string) || config.locationId;

    switch (toolName) {
      case 'get_forms': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        if (args.skip) params.append('skip', String(args.skip));
        if (args.limit) params.append('limit', String(args.limit));
        if (args.type) params.append('type', String(args.type));
        
        return this.ghlClient.makeRequest('GET', `/forms/?${params.toString()}`);
      }

      case 'get_form_submissions': {
        const formId = args.formId as string;
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        if (args.startAt) params.append('startAt', String(args.startAt));
        if (args.endAt) params.append('endAt', String(args.endAt));
        if (args.skip) params.append('skip', String(args.skip));
        if (args.limit) params.append('limit', String(args.limit));
        if (args.page) params.append('page', String(args.page));
        
        return this.ghlClient.makeRequest('GET', `/forms/submissions?formId=${formId}&${params.toString()}`);
      }

      case 'get_form_by_id': {
        const formId = args.formId as string;
        return this.ghlClient.makeRequest('GET', `/forms/${formId}?locationId=${locationId}`);
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}

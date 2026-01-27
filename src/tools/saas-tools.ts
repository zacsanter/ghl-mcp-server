/**
 * GoHighLevel SaaS/Agency Tools
 * Tools for agency-level operations (company/agency management)
 */

import { GHLApiClient } from '../clients/ghl-api-client.js';

export class SaasTools {
  constructor(private ghlClient: GHLApiClient) {}

  getToolDefinitions() {
    return [
      {
        name: 'get_saas_locations',
        description: 'Get all sub-accounts/locations for a SaaS agency. Requires agency-level access.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Company/Agency ID'
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of locations to return (default: 10, max: 100)'
            },
            order: {
              type: 'string',
              enum: ['asc', 'desc'],
              description: 'Sort order'
            },
            isActive: {
              type: 'boolean',
              description: 'Filter by active status'
            }
          },
          required: ['companyId']
        }
      },
      {
        name: 'get_saas_location',
        description: 'Get a specific sub-account/location by ID at the agency level',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Company/Agency ID'
            },
            locationId: {
              type: 'string',
              description: 'Location ID to retrieve'
            }
          },
          required: ['companyId', 'locationId']
        }
      },
      {
        name: 'update_saas_subscription',
        description: 'Update SaaS subscription settings for a location',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Company/Agency ID'
            },
            locationId: {
              type: 'string',
              description: 'Location ID'
            },
            subscriptionId: {
              type: 'string',
              description: 'Subscription ID'
            },
            status: {
              type: 'string',
              enum: ['active', 'paused', 'cancelled'],
              description: 'Subscription status'
            }
          },
          required: ['companyId', 'locationId']
        }
      },
      {
        name: 'pause_saas_location',
        description: 'Pause a SaaS sub-account/location',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Company/Agency ID'
            },
            locationId: {
              type: 'string',
              description: 'Location ID to pause'
            },
            paused: {
              type: 'boolean',
              description: 'Whether to pause (true) or unpause (false)'
            }
          },
          required: ['companyId', 'locationId', 'paused']
        }
      },
      {
        name: 'enable_saas_location',
        description: 'Enable or disable SaaS features for a location',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Company/Agency ID'
            },
            locationId: {
              type: 'string',
              description: 'Location ID'
            },
            enabled: {
              type: 'boolean',
              description: 'Whether to enable (true) or disable (false) SaaS'
            }
          },
          required: ['companyId', 'locationId', 'enabled']
        }
      },
      {
        name: 'rebilling_update',
        description: 'Update rebilling configuration for agency',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Company/Agency ID'
            },
            product: {
              type: 'string',
              description: 'Product to configure rebilling for'
            },
            markup: {
              type: 'number',
              description: 'Markup percentage'
            },
            enabled: {
              type: 'boolean',
              description: 'Whether rebilling is enabled'
            }
          },
          required: ['companyId']
        }
      }
    ];
  }

  async handleToolCall(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const companyId = args.companyId as string;

    switch (toolName) {
      case 'get_saas_locations': {
        const params = new URLSearchParams();
        params.append('companyId', companyId);
        if (args.skip) params.append('skip', String(args.skip));
        if (args.limit) params.append('limit', String(args.limit));
        if (args.order) params.append('order', String(args.order));
        if (args.isActive !== undefined) params.append('isActive', String(args.isActive));
        
        return this.ghlClient.makeRequest('GET', `/saas-api/public-api/locations?${params.toString()}`);
      }

      case 'get_saas_location': {
        const locationId = args.locationId as string;
        return this.ghlClient.makeRequest('GET', `/saas-api/public-api/locations/${locationId}?companyId=${companyId}`);
      }

      case 'update_saas_subscription': {
        const locationId = args.locationId as string;
        const body: Record<string, unknown> = { companyId };
        if (args.subscriptionId) body.subscriptionId = args.subscriptionId;
        if (args.status) body.status = args.status;
        
        return this.ghlClient.makeRequest('PUT', `/saas-api/public-api/locations/${locationId}/subscription`, body);
      }

      case 'pause_saas_location': {
        const locationId = args.locationId as string;
        return this.ghlClient.makeRequest('POST', `/saas-api/public-api/locations/${locationId}/pause`, {
          companyId,
          paused: args.paused
        });
      }

      case 'enable_saas_location': {
        const locationId = args.locationId as string;
        return this.ghlClient.makeRequest('POST', `/saas-api/public-api/locations/${locationId}/enable`, {
          companyId,
          enabled: args.enabled
        });
      }

      case 'rebilling_update': {
        const body: Record<string, unknown> = { companyId };
        if (args.product) body.product = args.product;
        if (args.markup !== undefined) body.markup = args.markup;
        if (args.enabled !== undefined) body.enabled = args.enabled;
        
        return this.ghlClient.makeRequest('PUT', `/saas-api/public-api/rebilling`, body);
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}

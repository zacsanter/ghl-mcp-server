/**
 * Tool Module Adapter
 * Normalizes the inconsistent interfaces across the 38 tool module classes
 * so the ToolRegistry can work with them uniformly.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface NormalizedToolModule {
  getDefinitions(): Tool[];
  execute(toolName: string, args: Record<string, unknown>): Promise<unknown>;
}

/**
 * Adapts any tool module to a normalized interface.
 * Handles the 4+ different method naming patterns across modules:
 * - getToolDefinitions() / getTools()
 * - executeTool() / handleToolCall() / executeXxxTool()
 */
export function adaptToolModule(module: any): NormalizedToolModule {
  // Resolve the definitions method
  const getDefinitions = (): Tool[] => {
    if (typeof module.getToolDefinitions === 'function') return module.getToolDefinitions();
    if (typeof module.getTools === 'function') return module.getTools();
    throw new Error(`Tool module has no getToolDefinitions() or getTools() method`);
  };

  // Resolve the execute method - try common names, then module-specific ones
  const execute = (toolName: string, args: Record<string, unknown>): Promise<unknown> => {
    if (typeof module.executeTool === 'function') return module.executeTool(toolName, args);
    if (typeof module.handleToolCall === 'function') return module.handleToolCall(toolName, args);
    // Module-specific execute methods
    if (typeof module.executeAssociationTool === 'function') return module.executeAssociationTool(toolName, args);
    if (typeof module.executeCustomFieldV2Tool === 'function') return module.executeCustomFieldV2Tool(toolName, args);
    if (typeof module.executeWorkflowTool === 'function') return module.executeWorkflowTool(toolName, args);
    if (typeof module.executeSurveyTool === 'function') return module.executeSurveyTool(toolName, args);
    if (typeof module.executeStoreTool === 'function') return module.executeStoreTool(toolName, args);
    if (typeof module.executeProductsTool === 'function') return module.executeProductsTool(toolName, args);
    throw new Error(`Tool module has no known execute method for tool: ${toolName}`);
  };

  return { getDefinitions, execute };
}

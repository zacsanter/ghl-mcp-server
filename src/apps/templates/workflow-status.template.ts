import { UITree } from '../types.js';

export function buildWorkflowStatusTree(data: {
  workflow: any;
  workflows: any[];
  workflowId: string;
  locationId: string;
}): UITree {
  const workflow = data.workflow || {};
  const workflows = data.workflows || [];
  const wfName = workflow.name || 'Workflow';

  // Build flow diagram from workflow structure if available
  const flowNodes: any[] = [];
  const flowEdges: any[] = [];

  // Add trigger node
  flowNodes.push({
    id: 'trigger',
    label: workflow.trigger?.type || 'Trigger',
    type: 'start',
    description: workflow.trigger?.name || 'Workflow trigger',
  });

  // If workflow has actions/steps, map them
  const actions = workflow.actions || workflow.steps || [];
  let prevId = 'trigger';
  for (let i = 0; i < Math.min(actions.length, 8); i++) {
    const action = actions[i];
    const nodeId = `action-${i}`;
    const isCondition = action.type === 'condition' || action.type === 'if_else';

    flowNodes.push({
      id: nodeId,
      label: action.name || action.type || `Step ${i + 1}`,
      type: isCondition ? 'condition' : 'action',
      description: action.description || undefined,
    });
    flowEdges.push({ from: prevId, to: nodeId });
    prevId = nodeId;
  }

  // End node
  flowNodes.push({ id: 'end', label: 'End', type: 'end' });
  flowEdges.push({ from: prevId, to: 'end' });

  // If no actions were found, create a simple placeholder flow
  if (actions.length === 0 && !workflow.trigger) {
    flowNodes.length = 0;
    flowEdges.length = 0;
    flowNodes.push(
      { id: 'start', label: 'Start', type: 'start' },
      { id: 'process', label: wfName, type: 'action', description: workflow.status || 'Active' },
      { id: 'end', label: 'End', type: 'end' },
    );
    flowEdges.push(
      { from: 'start', to: 'process' },
      { from: 'process', to: 'end' },
    );
  }

  // Workflow stats
  const activeCount = workflows.filter((w: any) => w.status === 'active').length;
  const draftCount = workflows.filter((w: any) => w.status === 'draft').length;

  return {
    root: 'page',
    elements: {
      page: {
        key: 'page',
        type: 'PageHeader',
        props: {
          title: wfName,
          subtitle: 'Workflow Status',
          status: workflow.status || 'active',
          statusVariant: workflow.status === 'active' ? 'active' : 'draft',
          gradient: true,
          stats: [
            { label: 'Status', value: (workflow.status || 'active').charAt(0).toUpperCase() + (workflow.status || 'active').slice(1) },
            { label: 'Total Workflows', value: String(workflows.length) },
            { label: 'Active', value: String(activeCount) },
            { label: 'Draft', value: String(draftCount) },
          ],
        },
        children: ['flow', 'statsGrid'],
      },
      flow: {
        key: 'flow',
        type: 'FlowDiagram',
        props: {
          nodes: flowNodes,
          edges: flowEdges,
          direction: 'horizontal',
          title: `${wfName} Flow`,
        },
      },
      statsGrid: {
        key: 'statsGrid',
        type: 'StatsGrid',
        props: { columns: 3 },
        children: ['sActive', 'sDraft', 'sTotal'],
      },
      sActive: {
        key: 'sActive',
        type: 'MetricCard',
        props: { label: 'Active Workflows', value: String(activeCount), color: 'green' },
      },
      sDraft: {
        key: 'sDraft',
        type: 'MetricCard',
        props: { label: 'Draft Workflows', value: String(draftCount), color: 'yellow' },
      },
      sTotal: {
        key: 'sTotal',
        type: 'MetricCard',
        props: { label: 'Total', value: String(workflows.length), color: 'blue' },
      },
    },
  };
}

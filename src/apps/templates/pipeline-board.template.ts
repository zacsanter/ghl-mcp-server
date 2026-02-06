import { UITree } from '../types.js';

export function buildPipelineBoardTree(data: {
  pipeline: any;
  opportunities: any[];
  stages: any[];
}): UITree {
  const pipeline = data.pipeline || {};
  const opportunities = data.opportunities || [];
  const stages = data.stages || [];

  const totalValue = opportunities.reduce((s: number, o: any) => s + (o.monetaryValue || 0), 0);
  const openCount = opportunities.filter((o: any) => o.status === 'open').length;
  const wonCount = opportunities.filter((o: any) => o.status === 'won').length;

  // Build kanban columns from real pipeline stages
  const columns = stages.map((stage: any) => {
    const stageOpps = opportunities.filter((o: any) => o.pipelineStageId === stage.id);
    const stageValue = stageOpps.reduce((s: number, o: any) => s + (o.monetaryValue || 0), 0);

    return {
      id: stage.id,
      title: stage.name,
      count: stageOpps.length,
      totalValue: stageValue > 0 ? `$${stageValue.toLocaleString()}` : undefined,
      cards: stageOpps.slice(0, 8).map((opp: any) => ({
        id: opp.id,
        title: opp.name || 'Untitled',
        subtitle: opp.contact?.name || opp.contact?.email || undefined,
        value: opp.monetaryValue ? `$${Number(opp.monetaryValue).toLocaleString()}` : undefined,
        status: opp.status || 'open',
        statusVariant: opp.status || 'open',
        date: opp.updatedAt ? new Date(opp.updatedAt).toLocaleDateString() : undefined,
        avatarInitials: opp.contact?.name
          ? opp.contact.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
          : undefined,
      })),
    };
  });

  return {
    root: 'page',
    elements: {
      page: {
        key: 'page',
        type: 'PageHeader',
        props: {
          title: pipeline.name || 'Pipeline',
          subtitle: `${opportunities.length} opportunities`,
          gradient: true,
          stats: [
            { label: 'Total Value', value: `$${totalValue.toLocaleString()}` },
            { label: 'Open', value: String(openCount) },
            { label: 'Won', value: String(wonCount) },
            { label: 'Stages', value: String(stages.length) },
          ],
        },
        children: ['board'],
      },
      board: {
        key: 'board',
        type: 'KanbanBoard',
        props: { columns },
      },
    },
  };
}

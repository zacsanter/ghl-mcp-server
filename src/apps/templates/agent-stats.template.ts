import { UITree } from '../types.js';

export function buildAgentStatsTree(data: {
  userId?: string;
  dateRange: string;
  location: any;
  locationId: string;
}): UITree {
  const location = data.location || {};
  const locName = location.name || 'Location';

  // Since GHL API doesn't have direct agent stats, build from available location data
  const dateRangeLabel =
    data.dateRange === 'last7days' ? 'Last 7 Days'
    : data.dateRange === 'last30days' ? 'Last 30 Days'
    : data.dateRange === 'last90days' ? 'Last 90 Days'
    : data.dateRange || 'Last 30 Days';

  // Build a placeholder stats view using available data
  const elements: UITree['elements'] = {
    page: {
      key: 'page',
      type: 'PageHeader',
      props: {
        title: data.userId ? `Agent: ${data.userId}` : 'Agent Overview',
        subtitle: `${locName} · ${dateRangeLabel}`,
        gradient: true,
        stats: [
          { label: 'Location', value: locName },
          { label: 'Period', value: dateRangeLabel },
        ],
      },
      children: ['metrics', 'layout'],
    },
    metrics: {
      key: 'metrics',
      type: 'StatsGrid',
      props: { columns: 4 },
      children: ['mTotal', 'mActive', 'mRes', 'mAvg'],
    },
    mTotal: {
      key: 'mTotal',
      type: 'MetricCard',
      props: { label: 'Total Interactions', value: '—', color: 'blue' },
    },
    mActive: {
      key: 'mActive',
      type: 'MetricCard',
      props: { label: 'Active Contacts', value: '—', color: 'green' },
    },
    mRes: {
      key: 'mRes',
      type: 'MetricCard',
      props: { label: 'Response Rate', value: '—', color: 'purple' },
    },
    mAvg: {
      key: 'mAvg',
      type: 'MetricCard',
      props: { label: 'Avg Response Time', value: '—', color: 'yellow' },
    },
    layout: {
      key: 'layout',
      type: 'SplitLayout',
      props: { ratio: '50/50', gap: 'md' },
      children: ['chart', 'activityTable'],
    },
    chart: {
      key: 'chart',
      type: 'LineChart',
      props: {
        points: [
          { label: 'Mon', value: 0 },
          { label: 'Tue', value: 0 },
          { label: 'Wed', value: 0 },
          { label: 'Thu', value: 0 },
          { label: 'Fri', value: 0 },
        ],
        title: 'Activity Trend',
        showPoints: true,
        showArea: true,
        yAxisLabel: 'Interactions',
      },
    },
    activityTable: {
      key: 'activityTable',
      type: 'DataTable',
      props: {
        columns: [
          { key: 'type', label: 'Activity', format: 'text' },
          { key: 'count', label: 'Count', format: 'text', sortable: true },
          { key: 'trend', label: 'Trend', format: 'text' },
        ],
        rows: [
          { type: 'Calls', count: '—', trend: '—' },
          { type: 'Emails', count: '—', trend: '—' },
          { type: 'SMS', count: '—', trend: '—' },
          { type: 'Tasks', count: '—', trend: '—' },
        ],
        emptyMessage: 'No activity data available',
        pageSize: 10,
      },
    },
  };

  return { root: 'page', elements };
}

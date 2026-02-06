import { UITree } from '../types.js';

export function buildCampaignStatsTree(data: {
  campaign: any;
  campaigns: any[];
  campaignId: string;
  locationId: string;
}): UITree {
  const campaign = data.campaign || {};
  const campaigns = data.campaigns || [];

  const stats = campaign.statistics || campaign.stats || {};
  const sent = stats.sent || stats.delivered || 0;
  const opened = stats.opened || stats.opens || 0;
  const clicked = stats.clicked || stats.clicks || 0;
  const bounced = stats.bounced || stats.bounces || 0;
  const unsubscribed = stats.unsubscribed || stats.unsubscribes || 0;
  const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : '0.0';
  const clickRate = sent > 0 ? ((clicked / sent) * 100).toFixed(1) : '0.0';

  // Bar chart of performance metrics
  const bars = [
    { label: 'Sent', value: sent, color: '#3b82f6' },
    { label: 'Opened', value: opened, color: '#059669' },
    { label: 'Clicked', value: clicked, color: '#7c3aed' },
    { label: 'Bounced', value: bounced, color: '#f59e0b' },
    { label: 'Unsubscribed', value: unsubscribed, color: '#dc2626' },
  ].filter(b => b.value > 0);

  // Other campaigns table
  const campaignRows = campaigns.slice(0, 8).map((c: any) => ({
    id: c.id,
    name: c.name || 'Untitled',
    status: c.status || 'draft',
    sent: c.statistics?.sent || 0,
    opens: c.statistics?.opened || 0,
  }));

  return {
    root: 'page',
    elements: {
      page: {
        key: 'page',
        type: 'PageHeader',
        props: {
          title: campaign.name || 'Campaign',
          subtitle: campaign.subject || 'Email Campaign',
          status: campaign.status || 'draft',
          statusVariant: campaign.status === 'completed' ? 'complete' : campaign.status === 'active' ? 'active' : 'draft',
          gradient: true,
          stats: [
            { label: 'Sent', value: sent.toLocaleString() },
            { label: 'Open Rate', value: `${openRate}%` },
            { label: 'Click Rate', value: `${clickRate}%` },
          ],
        },
        children: ['metrics', 'layout'],
      },
      metrics: {
        key: 'metrics',
        type: 'StatsGrid',
        props: { columns: 4 },
        children: ['mSent', 'mOpened', 'mClicked', 'mBounced'],
      },
      mSent: {
        key: 'mSent',
        type: 'MetricCard',
        props: { label: 'Sent', value: sent.toLocaleString(), color: 'blue' },
      },
      mOpened: {
        key: 'mOpened',
        type: 'MetricCard',
        props: { label: 'Opened', value: opened.toLocaleString(), color: 'green' },
      },
      mClicked: {
        key: 'mClicked',
        type: 'MetricCard',
        props: { label: 'Clicked', value: clicked.toLocaleString(), color: 'purple' },
      },
      mBounced: {
        key: 'mBounced',
        type: 'MetricCard',
        props: { label: 'Bounced', value: bounced.toLocaleString(), color: 'yellow' },
      },
      layout: {
        key: 'layout',
        type: 'SplitLayout',
        props: { ratio: '50/50', gap: 'md' },
        children: ['chart', 'campaignTable'],
      },
      chart: {
        key: 'chart',
        type: 'BarChart',
        props: {
          bars,
          orientation: 'horizontal',
          showValues: true,
          title: 'Performance Breakdown',
        },
      },
      campaignTable: {
        key: 'campaignTable',
        type: 'DataTable',
        props: {
          columns: [
            { key: 'name', label: 'Campaign', format: 'text', sortable: true },
            { key: 'status', label: 'Status', format: 'status' },
            { key: 'sent', label: 'Sent', format: 'text', sortable: true },
            { key: 'opens', label: 'Opens', format: 'text' },
          ],
          rows: campaignRows,
          emptyMessage: 'No other campaigns',
          pageSize: 8,
        },
      },
    },
  };
}

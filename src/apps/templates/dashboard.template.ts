import { UITree } from '../types.js';

export function buildDashboardTree(data: {
  recentContacts: any[];
  pipelines: any[];
  calendars: any[];
  locationId: string;
}): UITree {
  const contacts = data.recentContacts || [];
  const pipelines = data.pipelines || [];
  const calendars = data.calendars || [];

  const totalContacts = contacts.length;
  const totalPipelines = pipelines.length;
  const totalCalendars = calendars.length;

  // Recent contacts table rows
  const contactRows = contacts.slice(0, 8).map((c: any) => ({
    id: c.id || '',
    name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown',
    email: c.email || '—',
    phone: c.phone || '—',
    added: c.dateAdded ? new Date(c.dateAdded).toLocaleDateString() : '—',
  }));

  // Pipeline summary rows
  const pipelineRows = pipelines.slice(0, 5).map((p: any) => ({
    id: p.id || '',
    name: p.name || 'Untitled',
    stages: (p.stages || []).length,
    status: 'active',
  }));

  return {
    root: 'page',
    elements: {
      page: {
        key: 'page',
        type: 'PageHeader',
        props: {
          title: 'GHL Dashboard',
          subtitle: 'Overview',
          gradient: true,
          stats: [
            { label: 'Contacts', value: String(totalContacts) },
            { label: 'Pipelines', value: String(totalPipelines) },
            { label: 'Calendars', value: String(totalCalendars) },
          ],
        },
        children: ['metrics', 'layout'],
      },
      metrics: {
        key: 'metrics',
        type: 'StatsGrid',
        props: { columns: 3 },
        children: ['mContacts', 'mPipelines', 'mCalendars'],
      },
      mContacts: {
        key: 'mContacts',
        type: 'MetricCard',
        props: { label: 'Contacts', value: String(totalContacts), color: 'blue' },
      },
      mPipelines: {
        key: 'mPipelines',
        type: 'MetricCard',
        props: { label: 'Pipelines', value: String(totalPipelines), color: 'purple' },
      },
      mCalendars: {
        key: 'mCalendars',
        type: 'MetricCard',
        props: { label: 'Calendars', value: String(totalCalendars), color: 'green' },
      },
      layout: {
        key: 'layout',
        type: 'SplitLayout',
        props: { ratio: '67/33', gap: 'md' },
        children: ['contactsCard', 'pipelinesCard'],
      },
      contactsCard: {
        key: 'contactsCard',
        type: 'Card',
        props: { title: 'Recent Contacts', padding: 'none' },
        children: ['contactsTable'],
      },
      contactsTable: {
        key: 'contactsTable',
        type: 'DataTable',
        props: {
          columns: [
            { key: 'name', label: 'Name', format: 'avatar', sortable: true },
            { key: 'email', label: 'Email', format: 'email' },
            { key: 'phone', label: 'Phone', format: 'phone' },
            { key: 'added', label: 'Added', format: 'date' },
          ],
          rows: contactRows,
          emptyMessage: 'No contacts yet',
          pageSize: 8,
        },
      },
      pipelinesCard: {
        key: 'pipelinesCard',
        type: 'Card',
        props: { title: 'Pipelines', padding: 'none' },
        children: ['pipelinesTable'],
      },
      pipelinesTable: {
        key: 'pipelinesTable',
        type: 'DataTable',
        props: {
          columns: [
            { key: 'name', label: 'Pipeline', format: 'text' },
            { key: 'stages', label: 'Stages', format: 'text' },
            { key: 'status', label: 'Status', format: 'status' },
          ],
          rows: pipelineRows,
          emptyMessage: 'No pipelines',
          pageSize: 5,
        },
      },
    },
  };
}

import { UITree } from '../types.js';

export function buildOpportunityCardTree(data: any): UITree {
  const opp = data || {};
  const contact = opp.contact || {};
  const contactName = contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown';
  const monetaryValue = opp.monetaryValue || 0;

  const kvItems = [
    { label: 'Contact', value: contactName },
    { label: 'Email', value: contact.email || '—' },
    { label: 'Phone', value: contact.phone || '—' },
    { label: 'Value', value: `$${Number(monetaryValue).toLocaleString()}`, bold: true },
    { label: 'Status', value: (opp.status || 'open').charAt(0).toUpperCase() + (opp.status || 'open').slice(1) },
    { label: 'Source', value: opp.source || '—' },
    { label: 'Created', value: opp.createdAt ? new Date(opp.createdAt).toLocaleDateString() : '—' },
    { label: 'Updated', value: opp.updatedAt ? new Date(opp.updatedAt).toLocaleDateString() : '—' },
  ];

  // Build timeline from available data
  const timelineEvents: any[] = [];
  if (opp.createdAt) {
    timelineEvents.push({
      id: 'created',
      title: 'Opportunity Created',
      description: `Created with value $${Number(monetaryValue).toLocaleString()}`,
      timestamp: new Date(opp.createdAt).toLocaleString(),
      icon: 'system',
      variant: 'default',
    });
  }
  if (opp.updatedAt && opp.updatedAt !== opp.createdAt) {
    timelineEvents.push({
      id: 'updated',
      title: 'Last Updated',
      description: `Status: ${opp.status || 'open'}`,
      timestamp: new Date(opp.updatedAt).toLocaleString(),
      icon: 'note',
      variant: 'success',
    });
  }
  if (opp.lastStatusChangeAt) {
    timelineEvents.push({
      id: 'status-change',
      title: 'Status Changed',
      description: `Changed to ${opp.status || 'open'}`,
      timestamp: new Date(opp.lastStatusChangeAt).toLocaleString(),
      icon: 'task',
      variant: opp.status === 'won' ? 'success' : opp.status === 'lost' ? 'error' : 'default',
    });
  }

  const elements: UITree['elements'] = {
    page: {
      key: 'page',
      type: 'DetailHeader',
      props: {
        title: opp.name || 'Untitled Opportunity',
        subtitle: contactName,
        entityId: opp.id,
        status: opp.status || 'open',
        statusVariant: opp.status || 'open',
      },
      children: ['layout'],
    },
    layout: {
      key: 'layout',
      type: 'SplitLayout',
      props: { ratio: '50/50', gap: 'md' },
      children: ['details', 'rightCol'],
    },
    details: {
      key: 'details',
      type: 'KeyValueList',
      props: { items: kvItems, compact: true },
    },
    rightCol: {
      key: 'rightCol',
      type: 'Card',
      props: { title: 'Activity', padding: 'sm' },
      children: ['timeline'],
    },
  };

  if (timelineEvents.length > 0) {
    elements.timeline = {
      key: 'timeline',
      type: 'Timeline',
      props: { events: timelineEvents },
    };
  } else {
    elements.timeline = {
      key: 'timeline',
      type: 'Timeline',
      props: {
        events: [
          {
            id: 'placeholder',
            title: 'No activity recorded',
            description: 'Activity will appear here as events are logged',
            timestamp: new Date().toLocaleString(),
            icon: 'system',
          },
        ],
      },
    };
  }

  // Add action bar
  elements.actions = {
    key: 'actions',
    type: 'ActionBar',
    props: { align: 'right' },
    children: ['editBtn', 'statusBtn'],
  };
  elements.editBtn = {
    key: 'editBtn',
    type: 'ActionButton',
    props: { label: 'Edit', variant: 'secondary', size: 'sm' },
  };
  elements.statusBtn = {
    key: 'statusBtn',
    type: 'ActionButton',
    props: {
      label: opp.status === 'won' ? 'Reopen' : 'Mark Won',
      variant: 'primary',
      size: 'sm',
    },
  };

  // Add actions to page children
  elements.page.children!.push('actions');

  return { root: 'page', elements };
}

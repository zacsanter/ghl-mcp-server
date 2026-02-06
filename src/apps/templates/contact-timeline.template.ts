import { UITree } from '../types.js';

export function buildContactTimelineTree(data: {
  contact: any;
  notes: any;
  tasks: any;
}): UITree {
  const contact = data.contact || {};
  const notes = Array.isArray(data.notes) ? data.notes : data.notes?.notes || [];
  const tasks = Array.isArray(data.tasks) ? data.tasks : data.tasks?.tasks || [];

  const contactName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown Contact';
  const email = contact.email || '—';
  const phone = contact.phone || '—';

  // Build timeline events from notes + tasks, sorted by date
  const events: any[] = [];

  for (const note of notes) {
    events.push({
      id: note.id || `note-${events.length}`,
      title: 'Note Added',
      description: note.body || note.content || note.text || 'Note',
      timestamp: note.dateAdded || note.createdAt ? new Date(note.dateAdded || note.createdAt).toLocaleString() : '—',
      icon: 'note',
      variant: 'default',
      _sort: new Date(note.dateAdded || note.createdAt || 0).getTime(),
    });
  }

  for (const task of tasks) {
    events.push({
      id: task.id || `task-${events.length}`,
      title: task.title || task.name || 'Task',
      description: task.description || task.body || (task.completed ? 'Completed' : 'Pending'),
      timestamp: task.dueDate || task.createdAt ? new Date(task.dueDate || task.createdAt).toLocaleString() : '—',
      icon: 'task',
      variant: task.completed ? 'success' : 'default',
      _sort: new Date(task.dueDate || task.createdAt || 0).getTime(),
    });
  }

  // Add contact creation event
  if (contact.dateAdded || contact.createdAt) {
    events.push({
      id: 'contact-created',
      title: 'Contact Created',
      description: `${contactName} was added to the CRM`,
      timestamp: new Date(contact.dateAdded || contact.createdAt).toLocaleString(),
      icon: 'system',
      variant: 'default',
      _sort: new Date(contact.dateAdded || contact.createdAt).getTime(),
    });
  }

  // Sort by date descending (newest first)
  events.sort((a, b) => (b._sort || 0) - (a._sort || 0));

  // Clean _sort from events
  const cleanEvents = events.map(({ _sort, ...rest }) => rest);

  return {
    root: 'page',
    elements: {
      page: {
        key: 'page',
        type: 'DetailHeader',
        props: {
          title: contactName,
          subtitle: email !== '—' ? email : phone,
          entityId: contact.id,
          status: contact.type || 'lead',
          statusVariant: 'active',
        },
        children: ['tabs', 'layout'],
      },
      tabs: {
        key: 'tabs',
        type: 'TabGroup',
        props: {
          tabs: [
            { label: 'Timeline', value: 'timeline', count: cleanEvents.length },
            { label: 'Notes', value: 'notes', count: notes.length },
            { label: 'Tasks', value: 'tasks', count: tasks.length },
          ],
          activeTab: 'timeline',
        },
      },
      layout: {
        key: 'layout',
        type: 'SplitLayout',
        props: { ratio: '33/67', gap: 'md' },
        children: ['contactInfo', 'timeline'],
      },
      contactInfo: {
        key: 'contactInfo',
        type: 'KeyValueList',
        props: {
          items: [
            { label: 'Name', value: contactName },
            { label: 'Email', value: email },
            { label: 'Phone', value: phone },
            { label: 'Tags', value: (contact.tags || []).join(', ') || '—' },
            { label: 'Source', value: contact.source || '—' },
            { label: 'Added', value: contact.dateAdded ? new Date(contact.dateAdded).toLocaleDateString() : '—' },
          ],
          compact: true,
        },
      },
      timeline: {
        key: 'timeline',
        type: 'Timeline',
        props: {
          events: cleanEvents.length > 0
            ? cleanEvents
            : [{
                id: 'placeholder',
                title: 'No activity yet',
                description: 'Notes, tasks, and activity will appear here',
                timestamp: new Date().toLocaleString(),
                icon: 'system',
              }],
        },
      },
    },
  };
}

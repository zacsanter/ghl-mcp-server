import { UITree } from '../types.js';

export function buildQuickBookTree(data: {
  calendar: any;
  contact: any;
  locationId: string;
}): UITree {
  const calendar = data.calendar || {};
  const contact = data.contact || null;
  const contactName = contact
    ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
    : undefined;

  const now = new Date();

  return {
    root: 'page',
    elements: {
      page: {
        key: 'page',
        type: 'PageHeader',
        props: {
          title: 'Quick Book',
          subtitle: calendar.name || 'Appointment Booking',
          gradient: true,
          stats: contact
            ? [
                { label: 'Contact', value: contactName || 'Selected' },
                { label: 'Calendar', value: calendar.name || '—' },
              ]
            : [{ label: 'Calendar', value: calendar.name || '—' }],
        },
        children: ['layout'],
      },
      layout: {
        key: 'layout',
        type: 'SplitLayout',
        props: { ratio: '50/50', gap: 'md' },
        children: ['calendarView', 'bookingForm'],
      },
      calendarView: {
        key: 'calendarView',
        type: 'CalendarView',
        props: {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          events: [],
          highlightToday: true,
          title: 'Select a Date',
        },
      },
      bookingForm: {
        key: 'bookingForm',
        type: 'FormGroup',
        props: {
          fields: [
            {
              key: 'contactId',
              label: 'Contact',
              type: 'text',
              value: contactName || '',
              required: true,
            },
            {
              key: 'date',
              label: 'Date',
              type: 'date',
              value: '',
              required: true,
            },
            {
              key: 'time',
              label: 'Time',
              type: 'text',
              value: '',
              required: true,
            },
            {
              key: 'notes',
              label: 'Notes',
              type: 'text',
              value: '',
            },
          ],
          submitLabel: 'Book Appointment',
          submitTool: 'create_appointment',
        },
      },
    },
  };
}

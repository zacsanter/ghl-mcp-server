import { UITree } from '../types.js';

export function buildCalendarViewTree(data: {
  calendar: any;
  events: any[];
  startDate: string;
  endDate: string;
}): UITree {
  const calendar = data.calendar || {};
  const events = data.events || [];

  // Map GHL events to CalendarView component events
  const calEvents = events.map((evt: any) => ({
    date: evt.startTime || evt.start || evt.date || '',
    title: evt.title || evt.name || 'Event',
    time: evt.startTime
      ? new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : undefined,
    type: evt.appointmentStatus === 'confirmed' ? 'meeting' as const : 'event' as const,
    color: evt.appointmentStatus === 'cancelled' ? '#dc2626' : undefined,
  }));

  const start = new Date(data.startDate);
  const confirmedCount = events.filter((e: any) => e.appointmentStatus === 'confirmed').length;
  const cancelledCount = events.filter((e: any) => e.appointmentStatus === 'cancelled').length;

  return {
    root: 'page',
    elements: {
      page: {
        key: 'page',
        type: 'PageHeader',
        props: {
          title: calendar.name || 'Calendar',
          subtitle: `${events.length} events`,
          gradient: true,
          stats: [
            { label: 'Total Events', value: String(events.length) },
            { label: 'Confirmed', value: String(confirmedCount) },
            { label: 'Cancelled', value: String(cancelledCount) },
          ],
        },
        children: ['calendar'],
      },
      calendar: {
        key: 'calendar',
        type: 'CalendarView',
        props: {
          year: start.getFullYear(),
          month: start.getMonth() + 1,
          events: calEvents,
          highlightToday: true,
        },
      },
    },
  };
}

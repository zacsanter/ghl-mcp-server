import { UITree } from '../types.js';

export function buildContactGridTree(data: { contacts: any[]; query?: string }): UITree {
  const contacts = data.contacts || [];

  const taggedCount = contacts.filter((c: any) => c.tags && c.tags.length > 0).length;
  const withEmail = contacts.filter((c: any) => c.email).length;

  const rows = contacts.map((c: any) => ({
    id: c.id || '',
    name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown',
    email: c.email || '—',
    phone: c.phone || '—',
    tags: c.tags || [],
    dateAdded: c.dateAdded ? new Date(c.dateAdded).toLocaleDateString() : '—',
    source: c.source || '—',
  }));

  return {
    root: 'page',
    elements: {
      page: {
        key: 'page',
        type: 'PageHeader',
        props: {
          title: 'Contacts',
          subtitle: data.query ? `Search: "${data.query}"` : 'All contacts',
          gradient: true,
          stats: [
            { label: 'Total', value: String(contacts.length) },
            { label: 'With Email', value: String(withEmail) },
            { label: 'Tagged', value: String(taggedCount) },
          ],
        },
        children: ['search', 'table'],
      },
      search: {
        key: 'search',
        type: 'SearchBar',
        props: { placeholder: 'Search contacts...', valuePath: 'query' },
      },
      table: {
        key: 'table',
        type: 'DataTable',
        props: {
          columns: [
            { key: 'name', label: 'Name', format: 'avatar', sortable: true },
            { key: 'email', label: 'Email', format: 'email', sortable: true },
            { key: 'phone', label: 'Phone', format: 'phone' },
            { key: 'tags', label: 'Tags', format: 'tags' },
            { key: 'dateAdded', label: 'Added', format: 'date', sortable: true },
            { key: 'source', label: 'Source', format: 'text' },
          ],
          rows,
          selectable: true,
          emptyMessage: 'No contacts found',
          pageSize: 15,
        },
      },
    },
  };
}

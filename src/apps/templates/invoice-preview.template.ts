import { UITree } from '../types.js';

export function buildInvoicePreviewTree(data: any): UITree {
  const invoice = data || {};
  const contact = invoice.contact || invoice.contactDetails || {};
  const businessInfo = invoice.businessDetails || {};
  const items = invoice.items || invoice.lineItems || [];
  const currency = invoice.currency || 'USD';

  const contactName = contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown';
  const businessName = businessInfo.name || invoice.businessName || 'Business';

  // Build line items
  const lineItems = items.map((item: any) => ({
    name: item.name || item.description || 'Item',
    description: item.description !== item.name ? item.description : undefined,
    quantity: item.quantity || item.qty || 1,
    unitPrice: item.price || item.unitPrice || item.amount || 0,
    total: (item.quantity || 1) * (item.price || item.unitPrice || item.amount || 0),
  }));

  const subtotal = lineItems.reduce((s: number, i: any) => s + i.total, 0);
  const discount = invoice.discount || 0;
  const tax = invoice.taxAmount || invoice.tax || 0;
  const total = invoice.total || invoice.amount || subtotal - discount + tax;
  const amountDue = invoice.amountDue ?? total;

  const fmtCurrency = (n: number) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
    } catch {
      return `$${n.toFixed(2)}`;
    }
  };

  const totals: Array<{ label: string; value: string; bold?: boolean; variant?: string; isTotalRow?: boolean }> = [
    { label: 'Subtotal', value: fmtCurrency(subtotal) },
  ];
  if (discount > 0) {
    totals.push({ label: 'Discount', value: `-${fmtCurrency(discount)}`, variant: 'danger' });
  }
  if (tax > 0) {
    totals.push({ label: 'Tax', value: fmtCurrency(tax) });
  }
  totals.push({ label: 'Total', value: fmtCurrency(total), bold: true, isTotalRow: true });
  if (amountDue !== total) {
    totals.push({ label: 'Amount Due', value: fmtCurrency(amountDue), variant: 'highlight' });
  }

  return {
    root: 'page',
    elements: {
      page: {
        key: 'page',
        type: 'DetailHeader',
        props: {
          title: `Invoice #${invoice.invoiceNumber || invoice.number || '—'}`,
          subtitle: invoice.title || `For ${contactName}`,
          entityId: invoice.id,
          status: invoice.status || 'draft',
          statusVariant: invoice.status === 'paid' ? 'paid' : invoice.status === 'sent' ? 'sent' : 'draft',
        },
        children: ['infoRow', 'lineItemsTable', 'totals'],
      },
      infoRow: {
        key: 'infoRow',
        type: 'SplitLayout',
        props: { ratio: '50/50', gap: 'md' },
        children: ['fromInfo', 'toInfo'],
      },
      fromInfo: {
        key: 'fromInfo',
        type: 'InfoBlock',
        props: {
          label: 'From',
          name: businessName,
          lines: [
            businessInfo.email || '',
            businessInfo.phone || '',
            businessInfo.address || '',
          ].filter(Boolean),
        },
      },
      toInfo: {
        key: 'toInfo',
        type: 'InfoBlock',
        props: {
          label: 'To',
          name: contactName,
          lines: [
            contact.email || '',
            contact.phone || '',
            contact.address || '',
          ].filter(Boolean),
        },
      },
      lineItemsTable: {
        key: 'lineItemsTable',
        type: 'LineItemsTable',
        props: {
          items: lineItems,
          currency,
        },
      },
      totals: {
        key: 'totals',
        type: 'KeyValueList',
        props: { items: totals },
      },
    },
  };
}

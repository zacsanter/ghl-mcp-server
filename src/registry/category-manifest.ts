/**
 * Category Manifest
 * Static mapping of all tool categories with human-readable metadata.
 * Used by discovery tools to help Claude decide which categories to enable.
 */

export interface CategoryDefinition {
  key: string;
  displayName: string;
  description: string;
  keywords: string[];
}

export const CATEGORY_MANIFEST: CategoryDefinition[] = [
  {
    key: 'contacts',
    displayName: 'Contact Management',
    description: 'Create, search, update, delete contacts. Manage tags, tasks, notes, followers, campaigns, and workflows for contacts.',
    keywords: ['contact', 'lead', 'crm', 'tag', 'task', 'note', 'follower']
  },
  {
    key: 'conversations',
    displayName: 'Conversations & Messaging',
    description: 'Send SMS, email, live chat messages. Search, create, update conversations. Get recordings, transcriptions, schedule messages.',
    keywords: ['conversation', 'message', 'sms', 'chat', 'inbox', 'email', 'send']
  },
  {
    key: 'blog',
    displayName: 'Blog Management',
    description: 'Create, update, list blog posts. Get blog sites, authors, categories. Check URL slug availability.',
    keywords: ['blog', 'post', 'article', 'content', 'author']
  },
  {
    key: 'opportunities',
    displayName: 'Opportunity & Pipeline Management',
    description: 'Manage sales opportunities and pipelines. Create, search, update deals. Track status (won/lost), upsert, manage followers.',
    keywords: ['opportunity', 'pipeline', 'deal', 'stage', 'sales', 'won', 'lost']
  },
  {
    key: 'calendar',
    displayName: 'Calendar & Appointments',
    description: 'Manage calendars, calendar groups, events, and appointments. Book appointments, check availability, block time slots. Manage calendar resources and notifications.',
    keywords: ['calendar', 'appointment', 'event', 'booking', 'schedule', 'availability', 'slot']
  },
  {
    key: 'email',
    displayName: 'Email Marketing',
    description: 'Manage email campaigns and templates. Create, update, list, delete email templates.',
    keywords: ['email', 'template', 'campaign', 'marketing']
  },
  {
    key: 'location',
    displayName: 'Location & Sub-Account Management',
    description: 'Search, create, update, delete locations/sub-accounts. Manage location tags, tasks, custom fields, custom values, and templates. Get timezones.',
    keywords: ['location', 'sub-account', 'agency', 'custom field', 'custom value', 'timezone']
  },
  {
    key: 'email-isv',
    displayName: 'Email Verification',
    description: 'Verify email deliverability and risk assessment.',
    keywords: ['email', 'verify', 'validation', 'deliverability']
  },
  {
    key: 'social-media',
    displayName: 'Social Media Posting',
    description: 'Create, search, update, delete social media posts. Manage connected accounts, bulk operations, CSV uploads, categories, tags, OAuth flows.',
    keywords: ['social', 'media', 'post', 'facebook', 'instagram', 'linkedin', 'twitter', 'tiktok']
  },
  {
    key: 'media',
    displayName: 'Media Library',
    description: 'List files and folders with search/filter. Upload files or hosted URLs. Delete files and folders.',
    keywords: ['media', 'file', 'upload', 'image', 'folder', 'library']
  },
  {
    key: 'objects',
    displayName: 'Custom Objects',
    description: 'Manage custom object schemas (create, update, get). CRUD operations on object records. Search records by properties.',
    keywords: ['object', 'schema', 'record', 'custom', 'data']
  },
  {
    key: 'associations',
    displayName: 'Record Associations',
    description: 'Create and manage associations between records. Get association schemas and linked records.',
    keywords: ['association', 'link', 'relationship', 'record']
  },
  {
    key: 'custom-fields-v2',
    displayName: 'Custom Fields V2',
    description: 'CRUD operations on custom fields (V2 API). Manage field definitions, options, and file uploads.',
    keywords: ['custom field', 'field', 'definition', 'option']
  },
  {
    key: 'workflows',
    displayName: 'Workflow Management',
    description: 'Get workflow details and configuration.',
    keywords: ['workflow', 'automation']
  },
  {
    key: 'surveys',
    displayName: 'Survey Management',
    description: 'List surveys and get survey submissions.',
    keywords: ['survey', 'form', 'submission', 'response']
  },
  {
    key: 'store',
    displayName: 'Store & E-Commerce',
    description: 'Manage online store settings, categories, shipping, and inventory. Handle checkout, customer management, and store configuration.',
    keywords: ['store', 'ecommerce', 'shop', 'checkout', 'inventory', 'shipping', 'category']
  },
  {
    key: 'products',
    displayName: 'Product Management',
    description: 'Create, get, update, delete products. Manage product prices and listings.',
    keywords: ['product', 'price', 'listing', 'catalog']
  },
  {
    key: 'payments',
    displayName: 'Payments & Orders',
    description: 'Manage payment integrations, orders, fulfillments, transactions, subscriptions, and coupons. Custom payment providers.',
    keywords: ['payment', 'order', 'transaction', 'subscription', 'coupon', 'fulfillment']
  },
  {
    key: 'invoices',
    displayName: 'Invoices & Billing',
    description: 'Create and manage invoice templates, schedules, invoices, and estimates. Generate invoice numbers, manage late fees.',
    keywords: ['invoice', 'billing', 'estimate', 'template', 'schedule']
  },
  {
    key: 'forms',
    displayName: 'Form Management',
    description: 'List all forms, get form details, get form submissions with pagination.',
    keywords: ['form', 'submission', 'input']
  },
  {
    key: 'users',
    displayName: 'User Management',
    description: 'Search, get, create, update, delete users. Manage user permissions and roles.',
    keywords: ['user', 'account', 'permission', 'role']
  },
  {
    key: 'funnels',
    displayName: 'Funnel & Website Management',
    description: 'List funnels, get funnel pages, count funnels. Manage website pages and redirects.',
    keywords: ['funnel', 'website', 'page', 'landing', 'redirect']
  },
  {
    key: 'businesses',
    displayName: 'Business Management',
    description: 'Create, get, update, delete businesses. List all businesses for a location.',
    keywords: ['business', 'company', 'organization']
  },
  {
    key: 'links',
    displayName: 'Link Management',
    description: 'Create, get, update, delete tracked links. List all links.',
    keywords: ['link', 'url', 'tracking', 'redirect']
  },
  {
    key: 'companies',
    displayName: 'Company Management',
    description: 'Create, get, update, delete companies. Search companies by name or domain.',
    keywords: ['company', 'business', 'domain', 'organization']
  },
  {
    key: 'saas',
    displayName: 'SaaS Management',
    description: 'Manage SaaS locations, subscriptions, rebilling, and bulk updates.',
    keywords: ['saas', 'subscription', 'rebilling', 'plan']
  },
  {
    key: 'snapshots',
    displayName: 'Snapshot Management',
    description: 'Get, create, share, delete snapshots. Get snapshot push status between locations.',
    keywords: ['snapshot', 'template', 'backup', 'restore']
  },
  {
    key: 'courses',
    displayName: 'Course & Membership Management',
    description: 'Manage courses, products, categories, posts, exams, quizzes, offers, and imports. Comprehensive learning platform tools.',
    keywords: ['course', 'membership', 'lesson', 'exam', 'quiz', 'offer', 'learning']
  },
  {
    key: 'campaigns',
    displayName: 'Campaign Management',
    description: 'List, get, create, update, delete campaigns. Manage campaign emails, schedules, and templates.',
    keywords: ['campaign', 'drip', 'sequence', 'automation']
  },
  {
    key: 'reporting',
    displayName: 'Reporting & Analytics',
    description: 'Get appointment, call, attribution, and conversion reports. Analyze agent, source, and channel performance.',
    keywords: ['report', 'analytics', 'statistics', 'attribution', 'conversion']
  },
  {
    key: 'oauth',
    displayName: 'OAuth & Authentication',
    description: 'Manage OAuth tokens, installed locations, access tokens. Generate auth URLs and handle token lifecycle.',
    keywords: ['oauth', 'token', 'auth', 'access', 'refresh']
  },
  {
    key: 'webhooks',
    displayName: 'Webhook Management',
    description: 'Create, get, update, delete, list webhooks. Manage event subscriptions and webhook configurations.',
    keywords: ['webhook', 'event', 'subscription', 'callback']
  },
  {
    key: 'phone',
    displayName: 'Phone & Telephony',
    description: 'Manage phone numbers, purchase numbers, update settings. Handle IVR, forwarding, trusted numbers, and call management.',
    keywords: ['phone', 'number', 'call', 'ivr', 'telephony', 'forward', 'sms']
  },
  {
    key: 'reputation',
    displayName: 'Reputation Management',
    description: 'Manage reviews, review responses, and review requests. Get review analytics and Google My Business review links.',
    keywords: ['reputation', 'review', 'rating', 'google', 'feedback']
  },
  {
    key: 'affiliates',
    displayName: 'Affiliate Management',
    description: 'Manage affiliate campaigns, leads, customers, payouts, and commissions. Track affiliate performance.',
    keywords: ['affiliate', 'referral', 'commission', 'payout', 'lead']
  },
  {
    key: 'templates',
    displayName: 'Template Management',
    description: 'Manage SMS, email, and WhatsApp templates. Create, update, delete templates across channels.',
    keywords: ['template', 'sms', 'email', 'whatsapp']
  },
  {
    key: 'smartlists',
    displayName: 'Smart List Management',
    description: 'Create, get, update, delete smart lists. Manage smart list filters and criteria.',
    keywords: ['smartlist', 'list', 'segment', 'filter']
  },
  {
    key: 'triggers',
    displayName: 'Trigger Management',
    description: 'Create, get, update, delete triggers. Manage trigger conditions, actions, and event-based automation.',
    keywords: ['trigger', 'event', 'action', 'condition', 'automation']
  }
];

import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'getting-started',
    'concepts',
    {
      type: 'category',
      label: 'Storage providers',
      collapsed: false,
      items: ['providers', 'custom-drivers', 'multi-tenant'],
    },
    {
      type: 'category',
      label: 'Uploads',
      collapsed: false,
      items: ['uploading', 'validation', 'service'],
    },
    'api',
    'migration',
  ],
};

export default sidebars;

import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: '@ackplus/nest-file-storage',
  tagline: 'One file-storage API for NestJS — Local, S3, Azure, or your own driver.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // Production URL for GitHub Pages: https://ack-solutions.github.io/nest-file-storage/
  url: 'https://ack-solutions.github.io',
  baseUrl: '/nest-file-storage/',

  organizationName: 'ack-solutions',
  projectName: 'nest-file-storage',

  onBrokenLinks: 'warn',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/', // docs are the site root
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/ack-solutions/nest-file-storage/tree/main/apps/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexBlog: false,
        docsRouteBasePath: '/', // docs are served at the site root
        highlightSearchTermsOnTargetPage: true,
        searchResultLimits: 8,
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'nest-file-storage',
      items: [
        { type: 'docSidebar', sidebarId: 'docsSidebar', position: 'left', label: 'Docs' },
        { to: '/migration', label: 'Migration', position: 'left' },
        {
          href: 'https://www.npmjs.com/package/@ackplus/nest-file-storage',
          label: 'npm',
          position: 'right',
        },
        {
          href: 'https://github.com/ack-solutions/nest-file-storage',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting started', to: '/getting-started' },
            { label: 'Custom drivers', to: '/custom-drivers' },
            { label: 'Multi-tenant', to: '/multi-tenant' },
            { label: 'Migration', to: '/migration' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'npm', href: 'https://www.npmjs.com/package/@ackplus/nest-file-storage' },
            { label: 'GitHub', href: 'https://github.com/ack-solutions/nest-file-storage' },
            { label: 'Issues', href: 'https://github.com/ack-solutions/nest-file-storage/issues' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} AckPlus. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

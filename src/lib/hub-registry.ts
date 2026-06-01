/**
 * HUB REGISTRY — Single source of truth for all hub pages.
 */

export interface HubPage {
  id: string;
  label: string;
  path: string;
  icon: string;
  color: string;
  category: 'core' | 'system' | 'custom';
  description: string;
  built_in: boolean;
  enabled: boolean;
  sort_order: number;
}

export const BUILTIN_PAGES: HubPage[] = [
  {
    id: 'home', label: 'Home', path: '/', icon: '⌂',
    color: '#3b82f6', category: 'core',
    description: 'Hub overview, stats, and quick access',
    built_in: true, enabled: true, sort_order: 0,
  },
  {
    id: 'agent', label: 'Agent', path: '/agent', icon: '◎',
    color: '#ec4899', category: 'core',
    description: 'Route, execute, and loop tasks across the skill registry',
    built_in: true, enabled: true, sort_order: 1,
  },
  {
    id: 'playground', label: 'Playground', path: '/playground', icon: '◧',
    color: '#84cc16', category: 'core',
    description: 'Test any skill directly — no routing overhead',
    built_in: true, enabled: true, sort_order: 2,
  },
  {
    id: 'skills', label: 'Skill Registry', path: '/skills', icon: '◈',
    color: '#8b5cf6', category: 'core',
    description: 'Browse, search, and filter all 88 agent skills',
    built_in: true, enabled: true, sort_order: 3,
  },
  {
    id: 'skill-editor', label: 'Skill Editor', path: '/skill-editor', icon: '◉',
    color: '#a78bfa', category: 'core',
    description: 'Edit trigger conditions, boundaries, and routing metadata',
    built_in: true, enabled: true, sort_order: 4,
  },
  {
    id: 'observability', label: 'Observability', path: '/observe', icon: '◑',
    color: '#06b6d4', category: 'core',
    description: 'Analytics, session history, and execution drill-down',
    built_in: true, enabled: true, sort_order: 5,
  },
  {
    id: 'config', label: 'Agent Config', path: '/config', icon: '◇',
    color: '#ec4899', category: 'system',
    description: 'Name, persona, memory, blocked skills, cost preference',
    built_in: true, enabled: true, sort_order: 6,
  },
  {
    id: 'database', label: 'Database', path: '/database', icon: '⬡',
    color: '#10b981', category: 'system',
    description: 'Database browser — inspect tables and data',
    built_in: true, enabled: true, sort_order: 7,
  },
  {
    id: 'extension', label: 'Extension', path: '/extension', icon: '⊕',
    color: '#f59e0b', category: 'system',
    description: 'Download & manage the API tracker Chrome extension',
    built_in: true, enabled: true, sort_order: 8,
  },
  {
    id: 'tracker', label: 'API Tracker', path: '/tracker', icon: '◐',
    color: '#22d3ee', category: 'system',
    description: 'Live feed of API endpoints captured by the extension',
    built_in: true, enabled: true, sort_order: 9,
  },
  {
    id: 'allowlist', label: 'Sync Allowlist', path: '/allowlist', icon: '⊜',
    color: '#f43f5e', category: 'system',
    description: 'Admin-only host patterns that the extension is allowed to sync',
    built_in: true, enabled: true, sort_order: 10,
  },
  {
    id: 'admin', label: 'Admin Console', path: '/admin', icon: '⚛',
    color: '#fbbf24', category: 'system',
    description: 'Admin-only console: endpoints, sessions, captured keys, audit log',
    built_in: true, enabled: true, sort_order: 11,
  },
];

export const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  core: { label: 'Core', color: '#3b82f6' },
  system: { label: 'System', color: '#f59e0b' },
  custom: { label: 'Custom', color: '#ec4899' },
};

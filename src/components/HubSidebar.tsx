import { Link, useLocation } from '@tanstack/react-router';
import { BUILTIN_PAGES, CATEGORY_CONFIG } from '@/lib/hub-registry';
import { useState } from 'react';

export default function HubSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const grouped = BUILTIN_PAGES.reduce((acc, p) => {
    const cat = p.category || 'custom';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, typeof BUILTIN_PAGES>);

  return (
    <aside
      className="flex flex-col flex-shrink-0 bg-sidebar border-r border-sidebar-border transition-all duration-200 overflow-hidden"
      style={{ width: collapsed ? 52 : 200 }}
    >
      {/* Logo */}
      <div className="border-b border-sidebar-border flex items-center" style={{ padding: collapsed ? '16px 0' : '16px 14px', justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <div>
            <div className="font-display text-sm font-black text-foreground tracking-tight">SKILL HUB</div>
            <div className="text-[8px] text-hub-text-dim tracking-[0.15em] uppercase">v6 · Agent OS</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="bg-transparent border-none text-hub-text-dim cursor-pointer text-sm p-0.5 leading-none flex-shrink-0"
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: collapsed ? '8px 0' : '8px 8px' }}>
        {Object.entries(grouped).map(([cat, catPages]) => (
          <div key={cat} className="mb-3">
            {!collapsed && (
              <div className="text-[8px] text-hub-text-dim tracking-[0.18em] uppercase px-1.5 mb-0.5">
                {CATEGORY_CONFIG[cat]?.label || cat}
              </div>
            )}
            {catPages.map(page => {
              const isActive = location.pathname === page.path;
              return (
                <Link
                  key={page.id}
                  to={page.path}
                  className="w-full flex items-center rounded-md mb-0.5 transition-all duration-100 no-underline"
                  style={{
                    gap: 9,
                    padding: collapsed ? '9px 0' : '8px 8px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: isActive ? page.color + '18' : 'transparent',
                    border: `1px solid ${isActive ? page.color + '44' : 'transparent'}`,
                    color: isActive ? page.color : 'var(--hub-text-muted)',
                  }}
                >
                  <span className="text-sm flex-shrink-0 leading-none">{page.icon}</span>
                  {!collapsed && (
                    <span
                      className="text-[11px] whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ fontWeight: isActive ? 700 : 400, color: isActive ? page.color : 'var(--muted-foreground)' }}
                    >
                      {page.label}
                    </span>
                  )}
                  {!collapsed && isActive && (
                    <div
                      className="ml-auto w-[5px] h-[5px] rounded-full flex-shrink-0"
                      style={{ background: page.color, boxShadow: `0 0 6px ${page.color}` }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Status */}
      <div className="border-t border-sidebar-border flex items-center" style={{ padding: collapsed ? '8px 0' : '8px 12px', justifyContent: collapsed ? 'center' : 'flex-start', gap: 6 }}>
        <div className="w-1.5 h-1.5 rounded-full bg-hub-green flex-shrink-0" style={{ boxShadow: '0 0 6px oklch(0.7 0.17 160)' }} />
        {!collapsed && <span className="text-[9px] text-hub-text-dim">CLOUD</span>}
      </div>
    </aside>
  );
}

import { useLocation } from '@tanstack/react-router';
import { BUILTIN_PAGES } from '@/lib/hub-registry';

export default function HubTopBar() {
  const location = useLocation();
  const current = BUILTIN_PAGES.find(p => p.path === location.pathname);

  return (
    <div className="h-9 border-b border-border bg-sidebar flex items-center px-4 gap-3 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-hub-text-dim">SKILL HUB</span>
        {current && (
          <>
            <span className="text-[10px] text-hub-text-dim">/</span>
            <span className="text-[10px] font-bold" style={{ color: current.color }}>
              {current.label.toUpperCase()}
            </span>
          </>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        <span className="text-[9px] text-hub-text-dim tracking-wider">BACKEND</span>
        <div className="flex items-center gap-1.5">
          <div className="w-[5px] h-[5px] rounded-full bg-hub-green" style={{ boxShadow: '0 0 5px oklch(0.7 0.17 160)' }} />
          <span className="text-[9px] text-hub-green">CONNECTED</span>
        </div>
      </div>
    </div>
  );
}

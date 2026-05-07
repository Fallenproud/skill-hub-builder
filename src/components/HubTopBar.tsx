import { useLocation } from '@tanstack/react-router';
import { BUILTIN_PAGES } from '@/lib/hub-registry';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export default function HubTopBar() {
  const location = useLocation();
  const current = BUILTIN_PAGES.find(p => p.path === location.pathname);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
    if (result.error) console.error(result.error);
  };
  const signOut = async () => { await supabase.auth.signOut(); };

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
        {email ? (
          <>
            <span className="text-[9px] text-hub-text-dim">{email}</span>
            <button onClick={signOut} className="text-[9px] text-hub-text-dim hover:text-foreground transition-colors">SIGN OUT</button>
          </>
        ) : (
          <button
            onClick={signIn}
            className="text-[9px] font-bold tracking-wider px-2 py-1 rounded border border-border hover:bg-hub-surface-hover transition-colors"
          >
            SIGN IN WITH GOOGLE
          </button>
        )}
        <span className="text-[9px] text-hub-text-dim tracking-wider">BACKEND</span>
        <div className="flex items-center gap-1.5">
          <div className="w-[5px] h-[5px] rounded-full bg-hub-green" style={{ boxShadow: '0 0 5px oklch(0.7 0.17 160)' }} />
          <span className="text-[9px] text-hub-green">CONNECTED</span>
        </div>
      </div>
    </div>
  );
}

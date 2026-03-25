"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export function NavbarDashboardLink({ scrolled }: { scrolled: boolean }) {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    const sync = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setAuthed(!!data.session);
    };

    void sync();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setAuthed(!!session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!authed) return null;

  return (
    <Link
      href="/dashboard"
      className={`text-sm font-medium transition-colors hover:text-primary ${
        scrolled
          ? "text-zinc-700 dark:text-zinc-300"
          : "text-white/90 hover:text-white"
      }`}
    >
      Dashboard
    </Link>
  );
}

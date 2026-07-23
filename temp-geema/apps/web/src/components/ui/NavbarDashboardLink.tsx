"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export function NavbarDashboardLink({ scrolled }: { scrolled: boolean }) {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    // supabase puede ser null si las env vars no están configuradas
    if (!supabase) return;

    // Capturamos la instancia en una variable local para que TS la trate
    // como no-null dentro de todos los closures de este efecto
    const client = supabase;
    let mounted = true;

    const sync = async () => {
      const { data } = await client.auth.getSession();
      if (mounted) setAuthed(!!data.session);
    };

    void sync();

    const { data: sub } = client.auth.onAuthStateChange((_evt, session) => {
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

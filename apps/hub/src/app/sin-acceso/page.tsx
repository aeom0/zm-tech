"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authCopy, brand } from "@/lib/content";

export default function SinAccesoPage() {
  const router = useRouter();
  const { isLoading, token, member, sinAcceso, logout } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (member && !sinAcceso) {
      router.replace("/dashboard");
    }
  }, [isLoading, token, member, sinAcceso, router]);

  if (isLoading || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-full max-w-md animate-pulse rounded-xl bg-surface" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <ShieldOff className="h-6 w-6" />
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">
          {authCopy.noAccessTitle}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {authCopy.noAccessBody}
        </p>
        <p className="mt-2 text-xs text-muted">{authCopy.schemaMissingHint}</p>
        <p className="mt-4 text-xs text-muted">
          {brand.name} · {brand.product}
        </p>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          className="mt-6 w-full rounded-lg border border-border py-2.5 text-sm text-foreground transition hover:border-accent hover:text-accent"
        >
          {authCopy.noAccessLogout}
        </button>
      </div>
    </div>
  );
}

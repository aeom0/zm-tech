"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authCopy, brand } from "@/lib/content";

const inputClass =
  "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading: authCargando, token, member, sinAcceso } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = searchParams.get("from");
  const destino =
    from && from.startsWith("/") && !from.startsWith("//") && from !== "/login"
      ? from
      : "/dashboard";

  useEffect(() => {
    if (authCargando || !token) return;
    if (sinAcceso || !member) {
      router.replace("/sin-acceso");
      return;
    }
    router.replace(destino === "/sin-acceso" ? "/dashboard" : destino);
  }, [authCargando, token, member, sinAcceso, router, destino]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await login(email, password);
      // El effect redirige según membership
    } catch (err) {
      setError(err instanceof Error ? err.message : authCopy.errorGeneric);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <p className="font-display text-3xl font-bold tracking-tight text-foreground">
          {brand.name}{" "}
          <span className="text-accent">{brand.product}</span>
        </p>
        <p className="mt-2 text-sm text-muted">{authCopy.loginSubtitle}</p>
      </div>

      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              {authCopy.emailLabel}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={authCopy.emailPlaceholder}
              className={inputClass}
              disabled={cargando || authCargando}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              {authCopy.passwordLabel}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={authCopy.passwordPlaceholder}
              className={inputClass}
              disabled={cargando || authCargando}
            />
          </div>

          <button
            type="submit"
            disabled={cargando || authCargando}
            className="flex w-full items-center justify-center rounded-lg bg-accent py-3 text-sm font-semibold text-background transition hover:bg-accent-hover disabled:opacity-60"
          >
            {cargando ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : (
              authCopy.submit
            )}
          </button>

          {error ? (
            <p className="text-center text-sm text-danger">{error}</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8 h-10 w-48 animate-pulse rounded bg-surface" />
      <div className="h-80 w-full max-w-md animate-pulse rounded-xl border border-border bg-surface" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

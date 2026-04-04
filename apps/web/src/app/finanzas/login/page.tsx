"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Lock, Mail, KeyRound, FlaskConical } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const DEMO_PASSWORD = "SalonPro2025!";

const DEMO_EMAILS = new Set([
  "demo.salon@ejemplo.com",
  "demo.nails@ejemplo.com",
  "demo.barberia@ejemplo.com",
  "demo.estetica@ejemplo.com",
]);

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const demoEmail = searchParams.get("demo") ?? "";
  const isDemo = DEMO_EMAILS.has(demoEmail);

  const [email, setEmail] = useState(demoEmail);
  const [password, setPassword] = useState(isDemo ? DEMO_PASSWORD : "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Si llega demo por query param, auto-submit
  useEffect(() => {
    if (isDemo && demoEmail) {
      setEmail(demoEmail);
      setPassword(DEMO_PASSWORD);
    }
  }, [isDemo, demoEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.ok) {
        router.replace("/finanzas");
        router.refresh();
      } else {
        setError(result.error ?? "Error al iniciar sesi\u00f3n");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-md mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-[var(--primary)] transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
              style={{
                backgroundColor: isDemo
                  ? "rgba(233,30,140,0.12)"
                  : "var(--primary-10, rgba(99,102,241,0.1))",
              }}
            >
              {isDemo ? (
                <FlaskConical
                  className="w-7 h-7"
                  style={{ color: "#E91E8C" }}
                />
              ) : (
                <Lock className="w-7 h-7 text-[var(--primary)]" />
              )}
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {isDemo ? "Acceso demo" : "Iniciar sesi\u00f3n"}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1 text-sm">
              {isDemo
                ? "Sandbox en vivo \u00b7 Los datos se restablecen al cerrar sesi\u00f3n"
                : "Panel de finanzas \u00b7 Solo administraci\u00f3n"}
            </p>
          </div>

          {/* Banner demo */}
          {isDemo && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-sm border"
              style={{
                backgroundColor: "rgba(233,30,140,0.08)",
                borderColor: "rgba(233,30,140,0.25)",
                color: "#E91E8C",
              }}
            >
              <span className="font-semibold">Modo demo activo</span> \u00b7 Puedes
              explorar y modificar libremente. Todo se restaura al hacer
              logout.
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-5"
          >
            {error && (
              <div
                role="alert"
                className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-4 py-3"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Correo
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  placeholder="tu@negocio.com"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Contrase\u00f1a
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: isDemo
                  ? "linear-gradient(135deg, #E91E8C 0%, #9C27B0 100%)"
                  : "var(--primary)",
              }}
            >
              {loading ? "Entrando\u2026" : isDemo ? "Entrar al demo" : "Entrar"}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-500 dark:text-zinc-500 mt-6">
            {isDemo
              ? "Cuenta de demo \u00b7 No ingresar datos reales"
              : "Misma cuenta que la app m\u00f3vil (Supabase Auth)."}
          </p>
        </div>
      </main>
    </div>
  );
}

export default function FinanzasLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

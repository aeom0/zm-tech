"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { KeyRound, Lock, Mail } from "lucide-react";

import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      setError("Correo y contraseña requeridos");
      return;
    }

    if (!supabase) {
      setError(
        "Configuración de Supabase faltante. Revisa NEXT_PUBLIC_SUPABASE_* en apps/web/.env.local",
      );
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        const msg = signInError.message || "";
        if (/invalid login credentials/i.test(msg)) {
          setError("Correo o contraseña incorrectos");
          return;
        }
        setError("No se pudo iniciar sesión. Intenta de nuevo.");
        return;
      }

      router.replace("/panel/servicios");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark">
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col">
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mb-4">
                <Image
                  src="/logo-diamondSparkle.svg"
                  alt="SalonPro"
                  width={28}
                  height={28}
                />
              </div>
              <h1 className="text-xl font-bold text-white">Iniciar sesión</h1>
              <p className="text-zinc-400 mt-1 text-sm">
                Panel administrativo · Servicios
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 shadow-sm space-y-5"
            >
              {error && (
                <div
                  role="alert"
                  className="text-sm text-red-300 bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-3"
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-300 mb-1.5"
                >
                  Correo
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/[0.10] bg-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:border-transparent"
                    placeholder="tu@correo.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-zinc-300 mb-1.5"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/[0.10] bg-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#E91E8C] hover:bg-[#C2185B] text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:ring-offset-2 focus:ring-offset-[#0F0F0F] disabled:opacity-60 transition-colors"
              >
                {loading ? "Entrando…" : "Entrar"}
              </button>
            </form>

            <div className="text-center mt-6 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Misma cuenta que la app (Supabase Auth)
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


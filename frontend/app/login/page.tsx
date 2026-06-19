"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Spark from "@/components/Spark";
import { auth, setToken, getToken, getRole, getConsolePath } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  // Auth guard — redirect if already logged in
  useEffect(() => {
    const token = getToken();
    if (token) {
      const role = getRole() || "koc";
      router.push(getConsolePath(role));
      return;
    }
    setAuthorized(true);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await auth.login(email, password);
      setToken(res.token);
      localStorage.setItem("koc_role", res.user.role);
      if (res.user.role === "admin") { router.push("/admin"); return; }
      if (res.user.role === "merchant") { router.push("/dashboard"); return; }
      // KOC: check if profile exists
      try {
        const me = await auth.me(res.token);
        if (!(me as any).koc_profile) {
          router.push("/koc/apply");
        } else {
          router.push("/portal");
        }
      } catch {
        router.push("/koc/apply");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally { setLoading(false); }
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #FFF7ED, #FDF2F8, #F5F3FF)" }}>
        <div className="text-zinc-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #FFF7ED, #FDF2F8, #F5F3FF)" }}>
      <div className="w-full max-w-sm bg-white rounded-[20px] shadow-sm border border-rose-100 p-8">
        <div className="flex justify-center mb-6"><Spark size={36} /></div>
        <h1 className="text-2xl font-extrabold text-zinc-900 text-center mb-6">Welcome Back</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
            className="w-full rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none transition" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
            className="w-full rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none transition" />
          {error && <p className="text-rose-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-brand w-full py-3 text-base">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="text-sm text-zinc-500 text-center mt-4">
          No account? <Link href="/register" className="text-pink-500 font-semibold hover:underline">Register</Link>
        </p>
        <div className="mt-4 p-3 bg-zinc-50 rounded-xl text-xs text-zinc-400 text-center">
          Demo: admin@koc-engine.internal / admin123
        </div>
      </div>
    </div>
  );
}

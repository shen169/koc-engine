"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Spark from "@/components/Spark";
import { auth, setToken } from "@/lib/api";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("koc");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await auth.register(email, password, role);
      setToken(res.token);
      localStorage.setItem("koc_role", res.user.role);
      if (res.user.role === "merchant") router.push("/dashboard");
      else router.push("/koc/apply");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #FFF7ED, #FDF2F8, #F5F3FF)" }}>
      <div className="w-full max-w-sm bg-white rounded-[20px] shadow-sm border border-rose-100 p-8">
        <div className="flex justify-center mb-6"><Spark size={36} /></div>
        <h1 className="text-2xl font-extrabold text-zinc-900 text-center mb-6">Create Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-600 mb-2">I am a...</label>
            <div className="flex gap-2">
              {[{ r: "koc", l: "🎬 Creator" }, { r: "merchant", l: "🏢 Brand" }].map(({ r, l }) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`flex-1 py-2.5 rounded-full font-semibold text-sm transition ${role === r ? "btn-brand" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
            className="w-full rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none transition" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
            className="w-full rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none transition" />
          {error && <p className="text-rose-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-brand w-full py-3 text-base">
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
        <p className="text-sm text-zinc-500 text-center mt-4">
          Have an account? <Link href="/login" className="text-pink-500 font-semibold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

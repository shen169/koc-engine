"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Spark from "@/components/Spark";
import { auth, credits, clearToken, getConsolePath, getToken } from "@/lib/api";
import NotificationBell from "@/components/Notifications";

interface NavBarProps {
  user?: { email?: string } | null;
  role: string;
  balance?: number;
  title?: string;
}

const TIER_LABELS: Record<string, string> = {
  L3: "L3 Partner", L2: "L2 Creator", L1: "L1 Explorer",
  M3: "M3 Gold", M2: "M2 Silver", M1: "M1 Bronze",
};

const TIER_COLORS: Record<string, string> = {
  L3: "bg-gradient-to-r from-pink-500 to-purple-500 text-white",
  L2: "bg-purple-100 text-purple-700",
  L1: "bg-pink-100 text-pink-700",
  M3: "bg-gradient-to-r from-amber-400 to-orange-500 text-white",
  M2: "bg-amber-100 text-amber-700",
  M1: "bg-gray-200 text-gray-600",
};

export default function NavBar({ user: propUser, role, balance: propBalance, title }: NavBarProps) {
  const router = useRouter();
  const consolePath = getConsolePath(role);

  const [email, setEmail] = useState(propUser?.email || "");
  const [balance, setBalance] = useState<number | undefined>(propBalance);
  const [tier, setTier] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    if (!propUser?.email || propBalance === undefined || !tier) {
      Promise.all([
        auth.me(token).catch(() => null),
        credits.balance(token).catch(() => null),
      ]).then(([userData, balanceData]) => {
        if (userData) {
          if (!propUser?.email) {
            setEmail((userData as any).email || "");
          }
          // Extract tier from koc_trust or merchant_trust
          const kocTier = (userData as any).koc_trust?.tier;
          const merchantTier = (userData as any).merchant_trust?.tier;
          if (kocTier && !tier) setTier(kocTier);
          if (merchantTier && !tier) setTier(merchantTier);
        }
        if (balanceData && propBalance === undefined) {
          // API returns { total, withdrawable, bonus }
          setBalance((balanceData as any).total as number);
        }
      }).catch(() => {});
    }
  }, []);

  // Sync from props
  useEffect(() => {
    if (propUser?.email) setEmail(propUser.email);
  }, [propUser?.email]);

  useEffect(() => {
    if (propBalance !== undefined) setBalance(propBalance);
  }, [propBalance]);

  function handleSignOut() {
    clearToken();
    router.push("/");
  }

  return (
    <nav className="bg-white border-b border-zinc-100 h-14 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
          <Spark size={22} />
        </Link>
        <Link
          href={consolePath}
          className="text-sm font-semibold text-zinc-700 hover:text-pink-500 transition"
        >
          🖥️ Dashboard
        </Link>
        {title && (
          <>
            <span className="text-zinc-300">/</span>
            <span className="text-sm text-zinc-500">{title}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <NotificationBell role={role} />
        {tier && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TIER_COLORS[tier] || "bg-gray-100 text-gray-500"}`}>
            {TIER_LABELS[tier] || tier}
          </span>
        )}
        {email && <span className="text-zinc-400 text-xs">{email}</span>}
        {balance !== undefined && (
          <span className="bg-pink-50 text-pink-700 px-3 py-1 rounded-full font-bold text-xs">
            🪙 {balance} pts
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="text-zinc-400 hover:text-zinc-600 transition"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}

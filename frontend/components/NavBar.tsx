"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Spark from "@/components/Spark";
import { clearToken, getConsolePath } from "@/lib/api";
import NotificationBell from "@/components/Notifications";

interface NavBarProps {
  user: { email?: string } | null;
  role: string;
  balance?: number;
  title?: string;
}

export default function NavBar({ user, role, balance, title }: NavBarProps) {
  const router = useRouter();
  const consolePath = getConsolePath(role);

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
      <div className="flex items-center gap-4 text-sm">
        <NotificationBell role={role} />
        {user?.email && <span className="text-zinc-400">{user.email}</span>}
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

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, getToken, clearToken } from "@/lib/api";
import NotificationList from "@/components/NotificationList";

export default function AdminNotifications() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    auth.me(token).then((u) => {
      if (u.role !== "admin") { router.push("/dashboard"); return; }
    }).catch(() => { clearToken(); router.push("/login"); });
  }, [router]);

  return <NotificationList bgClass="bg-zinc-50" unreadBorderClass="border-zinc-300" />;
}

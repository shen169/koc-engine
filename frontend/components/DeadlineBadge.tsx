"use client";

import { useState, useEffect } from "react";

interface DeadlineBadgeProps {
  deadline: string;       // ISO 8601 timestamp
  label: string;          // e.g. "Submission" / "Shipment" / "Review"
  penalty?: string;       // e.g. "Late submission: deduct 15 Trust Score"
  size?: "sm" | "md";     // sm: inline badge, md: detail page block
  className?: string;
}

type Urgency = "normal" | "warning" | "urgent" | "expired";

function calcUrgency(deadline: string): { urgency: Urgency; hoursLeft: number; daysLeft: number; text: string } {
  const now = Date.now();
  const deadlineMs = new Date(deadline).getTime();
  const diffMs = deadlineMs - now;
  const hoursLeft = diffMs / (1000 * 60 * 60);
  const daysLeft = hoursLeft / 24;

  if (diffMs <= 0) {
    const daysOver = Math.abs(Math.floor(daysLeft));
    return {
      urgency: "expired",
      hoursLeft: 0,
      daysLeft: 0,
      text: daysOver === 0 ? "Overdue" : `${daysOver} days overdue`,
    };
  }

  if (daysLeft < 3) {
    const h = Math.floor(hoursLeft);
    return {
      urgency: "urgent",
      hoursLeft,
      daysLeft,
      text: h <= 24 ? (h < 1 ? "less than 1 hour" : `${h} hours left`) : `${Math.floor(daysLeft)} days left`,
    };
  }

  if (daysLeft <= 7) {
    return {
      urgency: "warning",
      hoursLeft,
      daysLeft,
      text: `${Math.floor(daysLeft)} days remaining`,
    };
  }

  return {
    urgency: "normal",
    hoursLeft,
    daysLeft,
    text: `${Math.floor(daysLeft)} days remaining`,
  };
}

const URGENCY_STYLES: Record<Urgency, { badge: string; icon: string; pulse: boolean }> = {
  normal:  { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "🟢", pulse: false },
  warning: { badge: "bg-amber-50 text-amber-700 border-amber-200",      icon: "🟡", pulse: true },
  urgent:  { badge: "bg-red-50 text-red-600 border-red-200",            icon: "🔴", pulse: true },
  expired: { badge: "bg-red-100 text-red-700 border-red-300",           icon: "⛔", pulse: false },
};

export default function DeadlineBadge({ deadline, label, penalty, size = "md", className = "" }: DeadlineBadgeProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const { urgency, text } = calcUrgency(deadline);
  const style = URGENCY_STYLES[urgency];

  if (size === "sm") {
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${style.badge} ${style.pulse ? "animate-pulse motion-reduce:animate-none" : ""} ${className}`}>
        {style.icon} {label}：{text}
      </span>
    );
  }

  return (
    <div className={`rounded-xl border px-4 py-3 ${style.badge} ${style.pulse ? "animate-pulse motion-reduce:animate-none" : ""} ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{style.icon}</span>
        <div>
          <p className="text-sm font-semibold">
            {label}：{text}
          </p>
          {penalty && urgency !== "normal" && (
            <p className="text-xs mt-0.5 opacity-80">{penalty}</p>
          )}
        </div>
      </div>
    </div>
  );
}

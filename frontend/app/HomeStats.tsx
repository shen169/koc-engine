"use client";

import { useEffect, useState } from "react";
import { landing } from "@/lib/api";

export function HomeStats() {
  const [stats, setStats] = useState({ total_kocs: 0, total_videos: 0, active_products: 0 });

  useEffect(() => {
    landing.stats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="flex gap-10 mt-16 text-center">
      {[
        [stats.total_kocs, "Vetted Creators"],
        [stats.total_videos, "Videos Delivered"],
        [stats.active_products, "Active Campaigns"],
      ].map(([val, label]) => (
        <div key={label as string}>
          <div className="text-4xl font-extrabold brand-gradient-stat">
            {(val as number) > 0 ? `${val}+` : "—"}
          </div>
          <div className="text-xs text-zinc-500 mt-1">{label as string}</div>
        </div>
      ))}
    </div>
  );
}

interface IntegrityBadgeProps {
  score: number;
  tier?: string;            // KOC: L1/L2/L3, Merchant: M1/M2/M3
  tierLabels?: Record<string, string>;  // custom tier label mapping
  totalCompleted?: number;
  totalDisputed?: number;
  avgRating?: number;
  showDetails?: boolean;
}

const LEVEL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  high: { label: "🛡️ 高信", bg: "bg-green-100", text: "text-green-700" },
  normal: { label: "⚠️ 一般", bg: "bg-blue-100", text: "text-blue-700" },
  low: { label: "🔶 低信", bg: "bg-yellow-100", text: "text-yellow-700" },
  danger: { label: "🚫 危险", bg: "bg-red-100", text: "text-red-700" },
};

const DEFAULT_TIER_COLORS: Record<string, string> = {
  L3: "bg-gradient-to-r from-amber-400 to-orange-500 text-white",
  L2: "bg-purple-100 text-purple-700",
  L1: "bg-pink-100 text-pink-700",
  M3: "bg-gradient-to-r from-amber-400 to-orange-500 text-white",
  M2: "bg-purple-100 text-purple-700",
  M1: "bg-gray-100 text-gray-600",
};

function getLevel(score: number): string {
  if (score >= 80) return "high";
  if (score >= 60) return "normal";
  if (score >= 40) return "low";
  return "danger";
}

export default function IntegrityBadge({
  score,
  tier,
  tierLabels,
  totalCompleted,
  totalDisputed,
  avgRating,
  showDetails = false,
}: IntegrityBadgeProps) {
  const level = getLevel(score);
  const cfg = LEVEL_CONFIG[level];

  return (
    <div className="inline-flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {tier && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${DEFAULT_TIER_COLORS[tier] || "bg-gray-100 text-gray-600"}`}>
            {tierLabels?.[tier] || tier}
          </span>
        )}
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
          {cfg.label} {score}/100
        </span>
      </div>

      {showDetails && (
        <div className="text-xs text-gray-400 space-y-0.5 mt-1">
          {totalCompleted !== undefined && <div>✅ 完成 {totalCompleted} 单</div>}
          {totalDisputed !== undefined && totalDisputed > 0 && (
            <div className="text-red-400">⚠️ {totalDisputed} 次争议</div>
          )}
          {avgRating !== undefined && avgRating > 0 && <div>⭐ {avgRating.toFixed(1)}</div>}
        </div>
      )}
    </div>
  );
}

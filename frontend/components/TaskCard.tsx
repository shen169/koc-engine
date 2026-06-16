"use client";

import { useRouter } from "next/navigation";

interface TaskCardProps {
  task: {
    task_id: string;
    product_name: string;
    product_asin: string;
    task_type: string;
    task_status: string;
    commission: number;
    koc_required: number;
    koc_filled: number;
    pledge_koc: number;
    merchant_id: string;
    merchant_company?: string;
    merchant_trust_score?: number;
    merchant_avg_rating?: number;
    created_at: string;
  };
  mode: "hall" | "merchant";
  token: string;
}

export default function TaskCard({ task, mode, token }: TaskCardProps) {
  const router = useRouter();
  const isUrgent = task.task_type === "urgent";
  const remaining = task.koc_required - task.koc_filled;
  const progressPct = Math.round((task.koc_filled / task.koc_required) * 100) || 0;

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-pink-200 transition-all duration-200 cursor-pointer group"
      onClick={() => {
        if (mode === "hall") {
          router.push(`/portal/tasks/${task.task_id}`);
        } else {
          router.push(`/dashboard/tasks/${task.task_id}`);
        }
      }}
    >
      {/* Top row: type badge + urgency */}
      <div className="flex items-center gap-2 mb-3">
        {isUrgent ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
            ⚡ 加急
          </span>
        ) : (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
            🌊 长线
          </span>
        )}
        {mode === "hall" && task.merchant_trust_score !== undefined && task.merchant_trust_score < 60 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
            🛡️ 低信
          </span>
        )}
      </div>

      {/* Product name */}
      <h3 className="font-semibold text-gray-900 text-lg mb-2 group-hover:text-pink-600 transition-colors">
        {task.product_name}
      </h3>

      {/* Info row */}
      <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
        <span>💰 佣金 <strong className="text-gray-800">{task.commission} 点</strong></span>
        {mode === "hall" && task.pledge_koc > 0 && (
          <span>🔒 质押 {task.pledge_koc} 点</span>
        )}
        <span>👥 {task.koc_filled}/{task.koc_required} 人</span>
        {mode === "hall" && task.merchant_avg_rating && (
          <span>⭐ {(task.merchant_avg_rating as number).toFixed(1)}</span>
        )}
      </div>

      {/* Progress bar (merchant mode) */}
      {mode === "merchant" && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>进度</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full brand-gradient rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Action hint */}
      {mode === "hall" && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <span className="text-xs text-gray-400">
            {isUrgent ? `⏰ 12h 内接单` : "🌊 长期有效"}
          </span>
          <span className="text-xs font-semibold text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">
            {isUrgent ? "接单 →" : "查看 →"}
          </span>
        </div>
      )}
    </div>
  );
}

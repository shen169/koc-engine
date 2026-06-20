"use client";

import { useRouter } from "next/navigation";
import DeadlineBadge from "@/components/DeadlineBadge";

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
    target_market?: string;
    created_at: string;
    // KOC's own slot info (for hall mode)
    my_slot_status?: string;       // "accepted" | "shipped" | "received" | "submitted" | "timed_out" | ...
    my_slot_deadline?: string;     // ISO timestamp of deadline
    my_slot_deadline_label?: string;
    my_slot_deadline_penalty?: string;
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
      className={`bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-pink-200 transition-all duration-200 cursor-pointer group ${
        task.my_slot_status === "timed_out" ? "opacity-60" : ""
      }`}
      onClick={() => {
        if (mode === "hall") {
          router.push(`/portal/tasks/${task.task_id}`);
        } else {
          router.push(`/dashboard/tasks/${task.task_id}`);
        }
      }}
    >
      {/* Top row: type badge + urgency + region */}
      <div className="flex items-center gap-2 mb-3">
        {isUrgent ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
            ⚡ Urgent
          </span>
        ) : (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
            🌊 Long-term
          </span>
        )}
        {task.target_market && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            🌍 {task.target_market}
          </span>
        )}
        {mode === "hall" && task.merchant_trust_score !== undefined && task.merchant_trust_score < 60 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
            🛡️ Low Trust
          </span>
        )}

        {/* Deadline badge for tasks the KOC has accepted */}
        {mode === "hall" && task.my_slot_deadline && (
          <DeadlineBadge
            deadline={task.my_slot_deadline}
            label={task.my_slot_deadline_label || ""}
            penalty={task.my_slot_deadline_penalty}
            size="sm"
          />
        )}

        {/* Timed out label */}
        {mode === "hall" && task.my_slot_status === "timed_out" && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
            ⛔ Overdue
          </span>
        )}
      </div>

      {/* Product name */}
      <h3 className="font-semibold text-gray-900 text-lg mb-2 group-hover:text-pink-600 transition-colors">
        {task.product_name}
      </h3>

      {/* Info row */}
      <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
        <span>💰 Commission <strong className="text-gray-800">${task.commission}</strong></span>
        {mode === "hall" && (
          <span>🔒 Pledge <strong className="text-gray-800">10</strong> pt</span>
        )}
        <span>👥 {task.koc_filled}/{task.koc_required} KOCs</span>
        {mode === "hall" && task.merchant_avg_rating && (
          <span>⭐ {(task.merchant_avg_rating as number).toFixed(1)}</span>
        )}
      </div>

      {/* Progress bar (merchant mode) */}
      {mode === "merchant" && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
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
            {isUrgent ? `⏰ Accept within 12h` : "⏰ Accept within 7 days"}
          </span>
          <span className="text-xs font-semibold text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">
            {isUrgent ? "Accept →" : "View →"}
          </span>
        </div>
      )}
    </div>
  );
}

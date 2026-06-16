interface SlotStatus {
  slot_index: number;
  koc_anon_id: string;
  status: string;
  content_urls?: string[];
  accepted_at?: string;
  shipped_at?: string;
  received_at?: string;
  submitted_at?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  assigned: { label: "待接单", color: "bg-gray-200 text-gray-600" },
  accepted: { label: "已接单", color: "bg-blue-100 text-blue-700" },
  shipped: { label: "已发货", color: "bg-purple-100 text-purple-700" },
  received: { label: "已收货", color: "bg-indigo-100 text-indigo-700" },
  creating: { label: "创作中", color: "bg-yellow-100 text-yellow-700" },
  submitted: { label: "已提交", color: "bg-green-100 text-green-700" },
  completed: { label: "已完成", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "已拒绝", color: "bg-red-100 text-red-600" },
  timed_out: { label: "已超时", color: "bg-orange-100 text-orange-600" },
};

export default function TaskProgress({ slots }: { slots: SlotStatus[] }) {
  const total = slots.length;
  const done = slots.filter((s) => s.status === "completed" || s.status === "submitted").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full brand-gradient rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
          {done}/{total}
        </span>
      </div>

      {/* Individual slots */}
      <div className="space-y-2">
        {slots.map((slot) => {
          const st = STATUS_LABELS[slot.status] || { label: slot.status, color: "bg-gray-100 text-gray-500" };
          return (
            <div
              key={slot.slot_index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-medium text-gray-700">
                  {slot.koc_anon_id || `Slot #${slot.slot_index + 1}`}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                  {st.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {slot.submitted_at && (
                  <span>📅 {new Date(slot.submitted_at).toLocaleDateString()}</span>
                )}
                {slot.content_urls && slot.content_urls.length > 0 && (
                  <span>🔗 {slot.content_urls.length} links</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

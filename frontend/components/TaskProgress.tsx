import DeadlineBadge from "@/components/DeadlineBadge";

interface SlotStatus {
  slot_index: number;
  koc_anon_id: string;
  status: string;
  content_urls?: string[];
  accepted_at?: string;
  shipped_at?: string;
  received_at?: string;
  submitted_at?: string;
  created_at?: string;
  task_type?: string;
  revision_count?: number;
  max_revisions?: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  assigned: { label: "Awaiting Acceptance", color: "bg-gray-200 text-gray-600" },
  accepted: { label: "Accepted", color: "bg-blue-100 text-blue-700" },
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-700" },
  received: { label: "Received", color: "bg-indigo-100 text-indigo-700" },
  creating: { label: "Creating", color: "bg-yellow-100 text-yellow-700" },
  submitted: { label: "Submitted", color: "bg-green-100 text-green-700" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-600" },
  timed_out: { label: "Timed Out", color: "bg-orange-100 text-orange-600" },
};

function getSlotDeadline(slot: SlotStatus, pledgeKoc: number = 10): { deadline: string; label: string; penalty: string } | null {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  switch (slot.status) {
    case "assigned": {
      if (slot.created_at) {
        const hours = slot.task_type === "urgent" ? 12 : 7 * 24;
        const ts = new Date(slot.created_at).getTime() + hours * HOUR;
        return { deadline: new Date(ts).toISOString(), label: "Acceptance Deadline", penalty: "Auto-redistribute on timeout" };
      }
      return null;
    }
    case "accepted": {
      if (slot.accepted_at) {
        const ts = new Date(slot.accepted_at).getTime() + 48 * HOUR;
        return { deadline: new Date(ts).toISOString(), label: "Shipment Deadline", penalty: "Merchant late shipment: return KOC pledge + deduct 20 Trust Score" };
      }
      return null;
    }
    case "shipped": {
      if (slot.shipped_at) {
        const ts = new Date(slot.shipped_at).getTime() + 7 * DAY;
        return { deadline: new Date(ts).toISOString(), label: "Receipt Deadline", penalty: "Auto-confirm receipt on timeout" };
      }
      return null;
    }
    case "received":
    case "creating": {
      if (slot.received_at) {
        const ts = new Date(slot.received_at).getTime() + 14 * DAY;
        const penaltyText = "Late submission: deduct 15 Trust Score + forfeit " + pledgeKoc + "pt pledge";
        return { deadline: new Date(ts).toISOString(), label: "Submission Deadline", penalty: penaltyText };
      }
      return null;
    }
    case "submitted": {
      if (slot.submitted_at) {
        const ts = new Date(slot.submitted_at).getTime() + 4 * DAY;
        return { deadline: new Date(ts).toISOString(), label: "Review Deadline", penalty: "Auto-approve if merchant doesn't review in 4 days" };
      }
      return null;
    }
    case "revision_requested": {
      const base = (slot as any).rejected_at || slot.submitted_at;
      if (base) {
        const ts = new Date(base).getTime() + 3 * DAY;
        return { deadline: new Date(ts).toISOString(), label: "Resubmission Deadline", penalty: "Late resubmission: penalty - deduct 15 Trust Score + forfeit pledge" };
      }
      return null;
    }
    default:
      return null;
  }
}

export default function TaskProgress({ slots, pledgeKoc = 10 }: { slots: SlotStatus[]; pledgeKoc?: number }) {
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
                {/* Revision count for revision_requested */}
                {slot.status === "revision_requested" && slot.revision_count !== undefined && (
                  <span className="text-xs text-orange-500 font-medium">
                    ⚠️ Revision {slot.revision_count}/{slot.max_revisions || 3}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {/* Countdown */}
                {(() => {
                  const dl = getSlotDeadline(slot, pledgeKoc);
                  return dl ? (
                    <DeadlineBadge
                      deadline={dl.deadline}
                      label={dl.label}
                      penalty={dl.penalty}
                      size="sm"
                    />
                  ) : null;
                })()}
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

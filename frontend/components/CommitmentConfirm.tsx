"use client";

import { useState } from "react";

interface RuleItem {
  icon: string;
  text: string;
}

interface CommitmentConfirmProps {
  open: boolean;
  title: string;
  commitments: RuleItem[];
  pledge: RuleItem[];
  redlines: RuleItem[];
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CommitmentConfirm({
  open,
  title,
  commitments,
  pledge,
  redlines,
  confirmLabel = "确认接单",
  onConfirm,
  onCancel,
}: CommitmentConfirmProps) {
  const [agreed, setAgreed] = useState(false);

  if (!open) return null;

  function renderSection(heading: string, items: RuleItem[], headingColor: string) {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <h3 className={`text-sm font-semibold mb-2 ${headingColor}`}>{heading}</h3>
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="mt-0.5 shrink-0">{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-xs text-gray-400 mb-4">请仔细阅读以下条款</p>

        {renderSection("📌 你的承诺", commitments, "text-blue-600")}
        {renderSection("💰 质押规则", pledge, "text-purple-600")}
        {renderSection("⛔ 红线（违约后果）", redlines, "text-red-600")}

        {/* Agreement checkbox */}
        <label className="flex items-start gap-3 mt-6 p-3 bg-amber-50 rounded-xl border border-amber-200 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-pink-500"
          />
          <span className="text-sm text-amber-800 font-medium">
            我已阅读并理解以上规则，知晓违约将导致质押被没收和信任分扣除
          </span>
        </label>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-500 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={!agreed}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            ✅ {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

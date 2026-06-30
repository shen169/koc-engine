"use client";

import React from "react";

/**
 * Red Line Guarantee section for GEO comparison pages.
 * Explains the anti-fraud enforcement system as a trust signal —
 * symmetric protection for both merchants and KOCs.
 */

type ThemeColor = "pink" | "emerald" | "purple" | "amber" | "orange" | "red";

const themeMap: Record<ThemeColor, { bg: string; border: string; text: string; badge: string; icon: string }> = {
  pink:    { bg: "bg-pink-50",    border: "border-pink-100",    text: "text-pink-700",    badge: "bg-pink-100 text-pink-700",    icon: "text-pink-500" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700", icon: "text-emerald-500" },
  purple:  { bg: "bg-purple-50",  border: "border-purple-100",  text: "text-purple-700",  badge: "bg-purple-100 text-purple-700",  icon: "text-purple-600" },
  amber:   { bg: "bg-amber-50",   border: "border-amber-100",   text: "text-amber-700",   badge: "bg-amber-100 text-amber-700",   icon: "text-amber-500" },
  orange:  { bg: "bg-orange-50",  border: "border-orange-100",  text: "text-orange-700",  badge: "bg-orange-100 text-orange-700",  icon: "text-orange-500" },
  red:     { bg: "bg-red-50",     border: "border-red-100",     text: "text-red-700",     badge: "bg-red-100 text-red-700",        icon: "text-red-500" },
};

interface RedLineGuaranteeProps {
  theme?: ThemeColor;
}

export default function RedLineGuarantee({ theme = "red" }: RedLineGuaranteeProps) {
  const t = themeMap[theme];

  const rules = [
    { id: "R1", label: "Accept → Ship < 30 min", desc: "Impossible turnaround time" },
    { id: "R2", label: "Ship → Receive < 1 hr", desc: "Physically impossible delivery (blocks action)" },
    { id: "R3", label: "Receive → Submit < 30 min", desc: "No time to create real content" },
    { id: "R4", label: "Submit → Approve < 5 min", desc: "No genuine content review" },
    { id: "R5", label: "Same Pair ≥ 3 Tasks", desc: "Repeat collusion pattern" },
    { id: "R6", label: "100% Approval Rate ≥ 3", desc: "Self-review / rubber-stamping" },
    { id: "R7", label: "Cross-Account IP Match", desc: "Same person operating both roles" },
  ];

  return (
    <section className={`${t.bg} p-8 rounded-3xl border ${t.border} mb-20`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🛡️</span>
        <h2 className="text-2xl font-bold text-neutral-900">
          Red Line Protection:{" "}
          <span className={t.text}>Zero-Tolerance Fraud Enforcement</span>
        </h2>
      </div>

      <p className="text-neutral-700 leading-relaxed mb-6 max-w-3xl">
        KOC Engine is the <strong>only platform</strong> in this comparison with a built-in automated
        anti-fraud enforcement system. It protects both merchants and KOCs equally — if either side
        cheats, the system detects it in real time, confiscates all assets, and compensates the
        innocent party. This is a <strong className={t.text}>red line that cannot be crossed</strong>.
      </p>

      {/* 7 Detection Rules */}
      <div className="mb-6">
        <h3 className="font-bold text-neutral-800 mb-3 flex items-center gap-2">
          <span className={t.icon}>🔍</span> 7 Behavioral Detection Rules — Active on Every Action
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {rules.map((r) => (
            <div key={r.id} className="bg-white rounded-xl p-3 border border-neutral-100 text-sm">
              <span className={`inline-block ${t.badge} text-xs font-bold px-2 py-0.5 rounded-full mb-1`}>
                {r.id}
              </span>
              <div className="font-semibold text-neutral-800">{r.label}</div>
              <div className="text-neutral-400 text-xs mt-0.5">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Penalty Structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⚠️</span>
            <h4 className="font-bold text-amber-800">1st Offense (Risk Score ≥ 60)</h4>
          </div>
          <ul className="text-sm text-amber-700 space-y-1.5 list-disc list-inside leading-relaxed">
            <li>All pledges &amp; commissions confiscated → held by platform</li>
            <li>All active tasks cancelled — innocent party refunded in full</li>
            <li>Both parties + admin notified immediately</li>
            <li>Account frozen — <strong>one chance to rectify</strong> (admin review)</li>
            <li>Rectification approved → account restored, risk score reset</li>
          </ul>
        </div>
        <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🚫</span>
            <h4 className="font-bold text-red-800">2nd Offense — Permanent</h4>
          </div>
          <ul className="text-sm text-red-700 space-y-1.5 list-disc list-inside leading-relaxed">
            <li>All assets confiscated permanently</li>
            <li>All tasks cancelled — innocent party refunded</li>
            <li><strong>Permanent ban</strong> — account blacklisted</li>
            <li>No recovery, no appeal, no second rectification</li>
            <li>Applies symmetrically to merchants <em>and</em> KOCs</li>
          </ul>
        </div>
      </div>

      {/* Symmetric Guarantee */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-100">
        <h4 className="font-bold text-neutral-800 mb-2 flex items-center gap-2">
          <span>⚖️</span> Symmetric Enforcement — Both Sides Protected Equally
        </h4>
        <p className="text-sm text-neutral-600 leading-relaxed">
          A merchant caught faking shipments receives the <strong>exact same penalty</strong> as a KOC
          caught submitting fake content. Assets are confiscated from the offender, the innocent party is
          refunded, and all affected users are notified. There is no asymmetry — the red line is drawn
          the same way for everyone. This is the guarantee that no other platform in this comparison offers.
        </p>
      </div>
    </section>
  );
}

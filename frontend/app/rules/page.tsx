import Link from "next/link";
import Spark from "@/components/Spark";

export default function RulesPage() {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FFF7ED 0%, #FDF2F8 50%, #F5F3FF 100%)" }}>
      {/* Header */}
      <header className="border-b border-white/50 bg-white/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Spark size={28} /> KOC Engine
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/login" className="text-gray-500 hover:text-gray-900">Login</Link>
            <Link href="/register" className="px-4 py-2 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {/* Title */}
        <section className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Platform Rules</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Everything you need to know about how KOC Engine works — commissions, pledges, timelines, and protections.
          </p>
        </section>

        {/* ── 1. Commission Model ── */}
        <RuleSection icon="💰" title="Commission Model" subtitle="How money flows on KOC Engine">
          <p className="mb-4">
            Brands pay KOCs directly through platform points. <strong>1pt = $1 USD</strong>. Points earned through commissions
            are withdrawable to your PayPal or bank account.
          </p>

          <ExampleBox>
            <div className="text-sm space-y-1">
              <div className="text-gray-500">Example: <strong>commission = 30pt, 3 KOCs needed</strong></div>
              <FlowStep actor="Brand" action={`Pays 5pt platform fee + (30pt × 3 KOCs) = 95pt total`} />
              <FlowStep actor="KOC" action="Pays 10pt pledge on accept (from bonus)" />
              <FlowStep actor="KOC" action={`Receives 27pt withdrawable (90%) + 10pt pledge returned (bonus) = 37pt total`} highlight />
              <FlowStep actor="Platform" action="Earns 5pt service fee + 3pt × 3 = 14pt (10% commission fee, min 1pt)" />
              <FlowStep actor="Brand" action={`Net cost: 95pt. Commission range: 20–50pt per KOC.`} />
            </div>
          </ExampleBox>

          <ul className="space-y-2 text-sm text-gray-600 mt-4">
            <li>• Commission pool is <strong>non-refundable</strong> — brands pre-pay at task creation. If KOC defaults, commission is refunded as bonus to brand.</li>
            <li>• Commission is paid to KOC only after content is approved (brand approval, AI judgment, or auto-approve)</li>
            <li>• Earned commission points (90%) are <strong>withdrawable</strong> by KOCs. Pledge returned as <strong>bonus</strong> (non-withdrawable).</li>
            <li>• <strong>Brands can never withdraw</strong> — all brand points are for publishing tasks only.</li>
          </ul>
        </RuleSection>

        {/* ── 2. Pledge System ── */}
        <RuleSection icon="🔒" title="Pledge System" subtitle="Deposits that protect both sides">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="py-2 pr-4 text-gray-400 font-medium">Who</th>
                <th className="py-2 pr-4 text-gray-400 font-medium">When</th>
                <th className="py-2 pr-4 text-gray-400 font-medium">Amount</th>
                <th className="py-2 text-gray-400 font-medium">Returned?</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4 font-medium">Brand</td>
                <td className="py-3 pr-4">Task publish</td>
                <td className="py-3 pr-4">commission × KOC count</td>
                <td className="py-3 text-red-500">No — paid to KOCs</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4 font-medium">Brand</td>
                <td className="py-3 pr-4">Task publish</td>
                <td className="py-3 pr-4">5pt platform fee</td>
                <td className="py-3 text-red-500">No — platform revenue</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium">KOC</td>
                <td className="py-3 pr-4">Accept task</td>
                <td className="py-3 pr-4">10pt fixed</td>
                <td className="py-3 text-green-600">Yes — 10pt fully returned (bonus)</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium">Platform</td>
                <td className="py-3 pr-4">Task completion</td>
                <td className="py-3 pr-4">10% of commission (min 1pt)</td>
                <td className="py-3 text-red-500">No — platform revenue</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
            <strong>⚠️ Pledge loss scenarios:</strong> KOC loses 10pt if they fail to submit content within 14 days,
            exceed revision limits, or are rejected by AI final judgment. Brand loses commission pool only on their own breach (48h shipping timeout). Brand can never withdraw — all refunds go to bonus balance for reuse.
          </div>
        </RuleSection>

        {/* ── 3. SLA Timeline ── */}
        <RuleSection icon="⏱️" title="SLA Timeline" subtitle="Deadlines and consequences for every stage">
          <div className="space-y-0">
            {[
              { stage: "KOC Accept Task", time: "12 hours", penalty: "Slot released, auto-redistributed. No penalty.", color: "blue" },
              { stage: "Brand Ship Product", time: "48 hours", penalty: "Brand violation: KOC pledge refunded in full (10pt). Brand Trust -20.", color: "amber" },
              { stage: "KOC Confirm Receipt", time: "7 days", penalty: "Auto-confirmed by system. No penalty.", color: "gray" },
              { stage: "KOC Submit Content", time: "14 days", penalty: "KOC violation: commission returned to brand. KOC forfeits 10pt pledge. Trust -15.", color: "red" },
              { stage: "Brand Review Content", time: "3 days", penalty: "Auto-approved by system. KOC gets 90% commission (withdrawable) + 10pt pledge returned. Both sides Trust +3.", color: "amber" },
              { stage: "KOC Revise & Resubmit", time: "3 days", penalty: "KOC violation: same as submit timeout. Commission returned to brand.", color: "red" },
              { stage: "Long-term Empty Slot", time: "7 days", penalty: "System auto-matches a KOC to fill the slot.", color: "gray" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0">
                <div className={`shrink-0 w-2 h-2 rounded-full mt-2 bg-${item.color}-400`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-gray-900 text-sm">{item.stage}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono font-semibold bg-${item.color}-50 text-${item.color}-600`}>
                      {item.time}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{item.penalty}</p>
                </div>
              </div>
            ))}
          </div>
        </RuleSection>

        {/* ── 4. Content Review & AI Judgment ── */}
        <RuleSection icon="🤖" title="Content Review & AI Judgment" subtitle="How content disputes are resolved fairly">
          <div className="bg-gray-50 rounded-xl p-5 font-mono text-sm text-gray-700 space-y-2">
            <div>KOC submits content (links + performance data)</div>
            <div className="pl-4 border-l-2 border-green-400">
              <span className="text-green-600 font-semibold">→ Brand approves</span> — KOC gets 90% commission (withdrawable) + 10pt pledge returned. Done. ✅
            </div>
            <div className="pl-4 border-l-2 border-orange-400">
              <span className="text-orange-600 font-semibold">→ Brand rejects</span> (must provide reason)
              <div className="pl-4 mt-1 text-gray-500">KOC revises and resubmits (1 revision)</div>
              <div className="pl-4 border-l-2 border-green-400 mt-1">
                <span className="text-green-600 font-semibold">→ Brand approves</span> — Done. ✅
              </div>
              <div className="pl-4 border-l-2 border-purple-400 mt-1">
                <span className="text-purple-600 font-semibold">→ Brand rejects again</span> — 🤖 AI Final Judgment
                <div className="pl-4 mt-1 space-y-1">
                  <div className="text-green-600">✓ AI approves → KOC wins. Brand can't block. Commission paid.</div>
                  <div className="text-red-600">✗ AI rejects → KOC loses. Commission returned to brand. Pledge forfeited.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
              <div className="font-semibold text-purple-800 mb-1">AI Checks For</div>
              <ul className="text-purple-700 space-y-1 text-xs">
                <li>• URLs matching claimed platform (TikTok/YouTube/etc.)</li>
                <li>• Performance data plausibility (no fabricated metrics)</li>
                <li>• Timeline consistency (published after accept)</li>
                <li>• Brand rejection pattern (vague reasons = suspicious)</li>
                <li>• KOC historical credibility (completed tasks, score)</li>
              </ul>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="font-semibold text-red-800 mb-1">Red Flags (Instant Reject)</div>
              <ul className="text-red-700 space-y-1 text-xs">
                <li>• No content URLs provided at all</li>
                <li>• URLs from unknown/non-social domains</li>
                <li>• Zero views with non-zero likes/comments</li>
                <li>• Clear fabrication patterns</li>
              </ul>
            </div>
          </div>
        </RuleSection>

        {/* ── 5. Points & Withdrawal ── */}
        <RuleSection icon="🏦" title="Points & Withdrawal" subtitle="Bonus vs earned points, and how to cash out">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="text-sm font-semibold text-blue-800 mb-2">🎁 Bonus Points</div>
              <div className="text-xs text-blue-700 space-y-1">
                <p>• Registration bonus (KOC: 200pt, Brand: 100pt)</p>
                <p>• <strong>Cannot be withdrawn</strong></p>
                <p>• Used for pledges (KOC) and task publishing (Brand)</p>
                <p>• Pledge returns go back to bonus</p>
                <p>• Platform-gifted, not earned</p>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <div className="text-sm font-semibold text-emerald-800 mb-2">💵 Earned Points (Withdrawable)</div>
              <div className="text-xs text-emerald-700 space-y-1">
                <p>• Commission from completed tasks (90%)</p>
                <p>• <strong>Can be withdrawn at 1pt = $1 USD</strong></p>
                <p>• KOC only — Brands cannot withdraw</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-2">
            <div className="font-medium text-gray-800">Withdrawal Rules (KOC only):</div>
            <p>• Must complete <strong>≥3 tasks</strong> to unlock withdrawal</p>
            <p>• Must have <strong>≥100pt withdrawable balance</strong> to initiate withdrawal</p>
            <p>• Only <strong>withdrawable</strong> points can be cashed out (commission earnings)</p>
            <p>• Bonus points (registration gift + pledge returns) are <strong>not withdrawable</strong></p>
            <p>• <strong>Daily withdrawal cap: 500pt</strong> — maximum per 24-hour window</p>
            <p>• <strong>Brands can never withdraw</strong> — points are for task publishing only</p>
            <p>• Withdraw via PayPal or bank transfer from KOC Credits page</p>
            <p>• Exchange rate: <strong>1pt = $1.00 USD</strong></p>
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ Minimum withdrawal: 100pt. Example: at 30pt commission, KOC earns 27pt/task → needs 4 completions (108pt) to reach threshold.
            </p>
          </div>
        </RuleSection>

        {/* ── 6. Trust Score ── */}
        <RuleSection icon="🛡️" title="Trust Score & Tiers" subtitle="Your reputation on the platform">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm font-semibold text-gray-800 mb-2">KOC Tiers</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-gray-400">
                    <th className="py-1 pr-2">Tier</th><th className="py-1 pr-2">Trust</th><th className="py-1 pr-2">Tasks</th><th className="py-1">Rating</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr><td className="py-1 pr-2 font-medium">🏆 L3 Partner</td><td>≥75</td><td>≥5</td><td>≥4.0</td></tr>
                  <tr><td className="py-1 pr-2 font-medium">⭐ L2 Creator</td><td>≥55</td><td>≥2</td><td>≥3.0</td></tr>
                  <tr><td className="py-1 pr-2 font-medium">🌱 L1 Explorer</td><td>0-100</td><td>any</td><td>any</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800 mb-2">Brand Tiers</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-gray-400">
                    <th className="py-1 pr-2">Tier</th><th className="py-1 pr-2">Trust</th><th className="py-1 pr-2">Tasks</th><th className="py-1">Rating</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr><td className="py-1 pr-2 font-medium">🏆 M3 Gold</td><td>≥75</td><td>≥10</td><td>≥4.0</td></tr>
                  <tr><td className="py-1 pr-2 font-medium">⭐ M2 Silver</td><td>≥55</td><td>≥3</td><td>≥3.0</td></tr>
                  <tr><td className="py-1 pr-2 font-medium">🌱 M1 Bronze</td><td>0-100</td><td>any</td><td>any</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-2">
            <div className="font-medium text-gray-800">Trust Score Adjustments:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-green-700">+3 · Task completed</div>
              <div className="text-green-700">+3 · Repeat collaboration bonus</div>
              <div className="text-red-700">−3 · Active task rejection</div>
              <div className="text-red-700">−15 · Violation (timeout/breach)</div>
              <div className="text-red-700">−20 · Brand shipping timeout (ghosted)</div>
              <div className="text-red-700">−30 · Report upheld by admin</div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <strong>⚠️ Thresholds:</strong> Trust &lt; 40 → Brand cannot publish tasks. Trust &lt; 30 → KOC excluded from matching.
            </div>
          </div>
        </RuleSection>

        {/* ── 7. Quick Reference ── */}
        <RuleSection icon="📋" title="Quick Reference Card" subtitle="All numbers at a glance">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 text-left">
                <th className="py-2 pr-4 text-gray-400 font-medium">Item</th>
                <th className="py-2 text-gray-400 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {[
                ["Brand platform fee (per task)", "5pt (non-refundable)"],
                ["Platform commission fee (per slot)", "10% of commission (min 1pt)"],
                ["KOC fixed pledge", "10pt (fully returned as bonus on completion)"],
                ["Commission pool", "commission × KOC count (brand pre-pays)"],
                ["Commission range", "20–50pt per KOC"],
                ["KOC commission take-home", "90% of commission (withdrawable)"],
                ["KOC registration bonus", "200pt (non-withdrawable)"],
                ["Brand registration bonus", "100pt (non-withdrawable)"],
                ["KOC withdrawal unlock", "≥3 completed tasks + ≥100pt withdrawable"],
                ["KOC daily withdrawal cap", "500pt per 24 hours"],
                ["Brand withdrawal", "Not allowed — points for publishing only"],
                ["Exchange rate", "1pt = $1.00 USD"],
                ["Max concurrent KOC tasks", "5 active slots"],
                ["Max revisions before AI judgment", "1"],
                ["Content review auto-approve", "3 days"],
                ["Content revision deadline", "3 days"],
                ["Shipping deadline", "48 hours"],
                ["Accept deadline", "12 hours"],
                ["Submit deadline", "14 days"],
                ["Contact admin", "honghuishen24@gmail.com"],
              ].map(([item, value], i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4">{item}</td>
                  <td className="py-2.5 font-mono font-medium">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </RuleSection>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-400 pt-8 border-t border-gray-200 space-y-1 pb-12">
          <p>Last updated: June 2026 · <Link href="/" className="text-pink-500 hover:text-pink-600">Back to Home</Link></p>
          <p>
            Questions or issues? Contact admin:{" "}
            <a href="mailto:honghuishen24@gmail.com" className="text-pink-500 hover:text-pink-600 underline">honghuishen24@gmail.com</a>
          </p>
        </footer>
      </main>
    </div>
  );
}

/* ── Reusable sub-components ── */

function RuleSection({ icon, title, subtitle, children }: {
  icon: string; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <p className="text-sm text-gray-400 mb-6">{subtitle}</p>
      {children}
    </section>
  );
}

function ExampleBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100 rounded-xl p-4">
      {children}
    </div>
  );
}

function FlowStep({ actor, action, highlight }: { actor: string; action: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${highlight ? "font-semibold text-pink-700" : "text-gray-600"}`}>
      <span className="text-xs w-16 shrink-0 font-medium text-gray-400">{actor}</span>
      <span>→</span>
      <span>{action}</span>
    </div>
  );
}

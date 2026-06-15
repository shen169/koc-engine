"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import CoinDrop from "@/components/CoinDrop";
import { tasks, getToken } from "@/lib/api";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Record<string, unknown> | null>(null);
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    tasks.get(id, token).then(setTask).catch(() => router.push("/portal"));
  }, [id, router]);

  async function handleSubmit() {
    const token = getToken();
    if (!token || !submitUrl) return;
    setSubmitting(true);
    const updated = await tasks.submit(id, submitUrl, token);
    setTask(updated);
    setSubmitting(false);
  }

  if (!task) return <div className="flex items-center justify-center min-h-screen bg-orange-50 text-zinc-400">Loading...</div>;

  const delivered = task.delivered as boolean;
  const sampleStatus = task.sample_status as string;
  const submitted = task.submit_url as string;
  const creditsReward = task.credits_reward as number;

  return (
    <div className="min-h-screen bg-orange-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center px-6 shadow-sm">
        <Link href="/portal" className="text-pink-500 text-sm font-semibold hover:underline">&larr; Dashboard</Link>
      </nav>
      <div className="max-w-lg mx-auto px-6 py-8">
        {showReward && <CoinDrop amount={creditsReward} label="Task completed!" />}

        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6">
          <h1 className="text-xl font-extrabold text-zinc-900 mb-3">{task.product_name as string || "Task Detail"}</h1>

          <div className="flex gap-2 mb-6">
            <span className={`text-xs px-3 py-1 rounded-full font-bold ${delivered ? "bg-emerald-50 text-emerald-700" : sampleStatus === "sent" ? "bg-cyan-50 text-cyan-700" : "bg-amber-50 text-amber-700"}`}>
              {delivered ? "✓ Delivered" : sampleStatus === "sent" ? "📦 Sample Sent" : "⏳ Awaiting Sample"}
            </span>
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-pink-50 text-pink-700">+{creditsReward} pts reward</span>
          </div>

          {/* Submit Section */}
          {sampleStatus === "sent" && !submitted && !delivered && (
            <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5 mb-6">
              <h3 className="font-extrabold text-pink-900 mb-2">🎬 Submit Your Video</h3>
              <p className="text-sm text-pink-700 mb-3">Paste the link to your published video.</p>
              <input value={submitUrl} onChange={(e) => setSubmitUrl(e.target.value)} placeholder="https://tiktok.com/@you/video/..."
                className="w-full rounded-xl border-2 border-pink-200 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none mb-3" />
              <button onClick={handleSubmit} disabled={!submitUrl || submitting}
                className="btn-brand px-5 py-2 text-sm">{submitting ? "Submitting..." : "Submit Video Link"}</button>
            </div>
          )}

          {/* Submitted */}
          {submitted && !delivered && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-6 text-sm text-emerald-800">
              <p className="font-bold mb-1">✓ Video Submitted</p>
              <p className="text-xs break-all text-emerald-600">Awaiting admin confirmation. Your credits will be rewarded soon!</p>
            </div>
          )}

          {/* Delivered */}
          {delivered && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-6 text-center">
              <p className="font-extrabold text-emerald-800 text-lg">🎉 Task Complete!</p>
              <p className="text-sm text-emerald-600 mt-1">Credits earned. Check your balance.</p>
              {!showReward && <button onClick={() => setShowReward(true)} className="mt-3 text-xs text-emerald-700 underline">See reward</button>}
            </div>
          )}

          {/* Info */}
          <div className="text-sm text-zinc-500 space-y-2">
            <div className="flex justify-between"><span>Sample Status</span> <strong className="text-zinc-700">{sampleStatus}</strong></div>
            {(task.due_at as string) && <div className="flex justify-between"><span>Due Date</span> <strong className="text-zinc-700">{task.due_at as string}</strong></div>}
            <div className="flex justify-between"><span>Credits Reward</span> <strong className="brand-gradient-text">{creditsReward} pts</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

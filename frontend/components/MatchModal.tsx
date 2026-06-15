"use client";

import { useEffect } from "react";
import { SparkEnter } from "./Spark";

interface MatchModalProps {
  kocName: string;
  companyName: string;
  onClose: () => void;
}

export default function MatchModal({ kocName, companyName, onClose }: MatchModalProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  // Generate 12 spark particles
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 360;
    const rad = (angle * Math.PI) / 180;
    const dist = 80 + Math.random() * 60;
    return { tx: Math.cos(rad) * dist, ty: Math.sin(rad) * dist, delay: i * 0.04 };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="relative bg-white rounded-[24px] p-12 max-w-sm w-full mx-4 text-center shadow-2xl animate-fade-in-up">
        {/* Spark particles */}
        {particles.map((p, i) => (
          <div key={i} className="absolute top-1/2 left-1/2" style={{ animation: `spark-particle 800ms ease-out ${p.delay}s forwards`, width: 8, height: 8, borderRadius: "50%", background: "linear-gradient(135deg, #EC4899, #8B5CF6)", "--tx": `${p.tx}px`, "--ty": `${p.ty}px` } as React.CSSProperties} />
        ))}

        <div className="relative z-10">
          <SparkEnter size={72} />
          <h2 className="text-2xl font-extrabold text-zinc-900 mt-6 mb-2">💚 You&apos;re Matched!</h2>
          <p className="text-zinc-500 text-sm mb-6">
            <span className="font-bold text-pink-500">{kocName}</span>
            <span className="mx-2">↔</span>
            <span className="font-bold text-purple-500">{companyName}</span>
          </p>
          <p className="text-xs text-zinc-400">The platform will handle next steps.<br />Check your email for updates.</p>
        </div>
      </div>
    </div>
  );
}

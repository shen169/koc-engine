"use client";

interface CoinDropProps {
  amount: number;
  label?: string;
}

export default function CoinDrop({ amount, label = "Credits earned!" }: CoinDropProps) {
  return (
    <div className="text-center py-6">
      <div className="animate-coin-drop text-5xl mb-2">🪙</div>
      <div className="animate-score-reveal" style={{ animationDelay: "200ms", opacity: 0 }}>
        <span className="text-3xl font-extrabold brand-gradient-text">+{amount}</span>
      </div>
      <p className="text-sm text-zinc-500 mt-2 animate-fade-in-up" style={{ animationDelay: "400ms", opacity: 0 }}>{label}</p>
    </div>
  );
}

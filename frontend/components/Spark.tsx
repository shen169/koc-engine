"use client";

interface SparkProps {
  size?: number;
  animate?: boolean;
  className?: string;
}

export default function Spark({ size = 48, animate = false, className = "" }: SparkProps) {
  return (
    <div
      className={`${animate ? "animate-spark-pulse" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #EC4899, #8B5CF6)",
        clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
        filter: "drop-shadow(0 0 12px rgba(236,72,153,0.4))",
      }}
    />
  );
}

export function SparkEnter({ size = 80 }: { size?: number }) {
  return (
    <div
      className="animate-spark-enter"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #EC4899, #8B5CF6)",
        clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
        filter: "drop-shadow(0 0 24px rgba(236,72,153,0.5))",
      }}
    />
  );
}

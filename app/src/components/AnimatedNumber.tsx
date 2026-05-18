import { useEffect, useRef, useState } from 'react';

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function AnimatedNumber({
  value,
  decimals = 1,
  duration = 500,
  className,
}: {
  value: number | undefined;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value?.toFixed(decimals) ?? '--');
  const prevRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    if (value === undefined) {
      setDisplay('--');
      prevRef.current = undefined;
      return;
    }

    const from = prevRef.current ?? value;
    prevRef.current = value;
    const delta = value - from;

    if (Math.abs(delta) < 0.001) {
      setDisplay(value.toFixed(decimals));
      return;
    }

    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      setDisplay((from + delta * eased).toFixed(decimals));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, decimals, duration]);

  return <span className={className}>{display}</span>;
}

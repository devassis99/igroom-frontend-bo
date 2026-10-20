import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * A box that eases to its content's height instead of jumping — a paged
 * table going from 20 rows to 7 slides shut rather than snapping, and
 * whatever sits below it (the pager) glides along.
 *
 * Measures the inner wrapper with a ResizeObserver and sets that as an
 * explicit height, which `.bo-auto-height` (index.css) transitions. Until
 * the first measurement the height is simply auto, so nothing animates on
 * mount.
 */
export function AutoHeight({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const observer = new ResizeObserver(() => setHeight(inner.offsetHeight));
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`bo-auto-height overflow-hidden ${className}`} style={{ height }}>
      <div ref={innerRef}>{children}</div>
    </div>
  );
}

export default AutoHeight;

"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders children only after mount. Use for Recharts / other libs that read
 * layout (width/height) and can throw during SSR or first paint with 0×0 size.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}

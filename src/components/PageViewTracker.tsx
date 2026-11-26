"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/src/lib/analytics";

/**
 * Tracks page views automatically when mounted, including navigations that
 * only change query-string parameters (#916). Both `pathname` and
 * `searchParams` are included in the effect dependency array so that a
 * filtered or sorted view (e.g. /activity?sort=amount) fires its own
 * page_view event distinct from /activity?sort=date.
 */
export default function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const search = searchParams.toString();
    const page = search ? `${pathname}?${search}` : pathname;
    trackEvent({ type: 'page_view', page });
  }, [pathname, searchParams]);

  return null;
}

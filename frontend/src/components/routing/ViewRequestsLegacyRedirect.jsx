import { Navigate, useSearchParams } from "react-router-dom"

/** Preserves ?tab=incoming and ?focus= when /dashboard/view-requests redirects to order center. */
export function ViewRequestsLegacyRedirect() {
  const [searchParams] = useSearchParams()
  const next = new URLSearchParams()
  next.set("section", "viewings")
  const tab = searchParams.get("tab")
  if (tab === "incoming" || tab === "outgoing") {
    next.set("tab", tab)
  }
  const focus = searchParams.get("focus")
  if (focus) {
    next.set("focus", focus)
  }
  return <Navigate to={`/dashboard/orders?${next.toString()}`} replace />
}

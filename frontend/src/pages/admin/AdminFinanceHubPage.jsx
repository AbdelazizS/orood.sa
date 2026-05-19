import { Navigate, useSearchParams } from "react-router-dom"

/** Legacy route — approval queues live under Financial operations. */
export function AdminFinanceHubPage() {
  const [searchParams] = useSearchParams()
  const next = new URLSearchParams(searchParams)
  next.set("tab", "queues")
  return <Navigate to={`/admin/finance-ops?${next.toString()}`} replace />
}

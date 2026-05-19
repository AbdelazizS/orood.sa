import { Navigate } from "react-router-dom"

export function SellerBidsPage() {
  return <Navigate to="/dashboard/orders?section=bids&tab=received" replace />
}

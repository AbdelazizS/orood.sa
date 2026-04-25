import { Navigate } from "react-router-dom"

export function SellerBidsPage() {
  return <Navigate to="/dashboard/bids?tab=received" replace />
}

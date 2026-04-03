import { Outlet } from "react-router-dom"
import { DashboardLayout } from "./DashboardLayout"

export function AdminLayout() {
  return (
    <DashboardLayout adminLinks>
      <Outlet />
    </DashboardLayout>
  )
}

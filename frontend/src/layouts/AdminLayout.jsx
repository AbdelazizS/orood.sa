import { Outlet } from "react-router-dom"
import { SeoHead } from "@/components/seo/SeoHead"
import { DashboardLayout } from "./DashboardLayout"

export function AdminLayout() {
  return (
    <DashboardLayout adminLinks>
      <SeoHead path="/admin" noindex />
      <Outlet />
    </DashboardLayout>
  )
}

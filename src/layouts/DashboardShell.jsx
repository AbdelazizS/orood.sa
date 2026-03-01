import { SidebarProvider } from "@/components/ui/sidebar"

/**
 * Dashboard shell: wraps with SidebarProvider so SidebarTrigger works.
 * Header is rendered inside DashboardLayout (inside SidebarInset).
 */
export function DashboardShell({ children }) {
  return <SidebarProvider>{children}</SidebarProvider>
}

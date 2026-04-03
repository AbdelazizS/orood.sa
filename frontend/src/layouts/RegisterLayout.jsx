import { Outlet } from "react-router-dom"
import { ThemeToggle } from "@/components/navigation/ThemeToggle"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

/**
 * Register page layout: no header, only theme + language in top-right.
 * Minimal, big-company style.
 */
export function RegisterLayout() {
  return (
    <div className="relative flex min-h-screen flex-col bg-muted">
      <div className="absolute end-4 top-4 z-10 flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <Outlet />
      </div>
    </div>
  )
}

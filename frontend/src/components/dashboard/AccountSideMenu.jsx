import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/useAuthStore"
import * as authService from "@/services/authService"
import { useNavigate } from "react-router-dom"
import { LogOut } from "lucide-react"
import { resolveImageUrl } from "@/lib/imageUrl"
import { getMemberDashboardNavFlat, isMemberNavItemActive } from "@/navigation/memberDashboardNav"

/** @deprecated Use getMemberDashboardNavFlat from @/navigation/memberDashboardNav */
export const sidebarLinks = []

export function AccountSideMenu({ className, onNavClick }) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const memberSince =
    user?.created_at != null
      ? new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short" })
      : null

  return (
    <div className={cn("flex w-full flex-col gap-3 md:gap-4", className)}>
      {user && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-4">
          {user.avatar_url ? (
            <img
              src={resolveImageUrl(user.avatar_url)}
              alt=""
              className="size-11 shrink-0 rounded-full object-cover ring-2 ring-background"
            />
          ) : (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground ring-2 ring-background">
              {(user.name || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">{user.name}</p>
            {memberSince && (
              <p className="truncate text-xs text-muted-foreground">
                {t("dashboard.memberSince", "Member since {{date}}", { date: memberSince })}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mb-3 px-3">
        <h3 className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
          {t("dashboard.menu", "قائمة الحساب")}
        </h3>
      </div>

      <div className="space-y-2">
        {getMemberDashboardNavFlat(user).map((link) => {
          const isActive = isMemberNavItemActive(link, location)
          return (
            <Link
              key={link.id}
              to={link.to}
              onClick={onNavClick}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all hover:bg-muted",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm ring-1 ring-border/60 hover:bg-primary/15"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <link.icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
              {t(link.labelKey)}
            </Link>
          )
        })}
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <button
          onClick={() => {
            authService.performLogout({ navigate, replaceTo: "/", queryClient })
            if (onNavClick) onNavClick()
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-all hover:bg-destructive/10"
        >
          <LogOut className="size-4" />
          {t("auth.logout", "تسجيل خروج")}
        </button>
      </div>
    </div>
  )
}

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/navigation/ThemeToggle"
import { UserMenu } from "@/components/navigation/UserMenu"
import { useAuthStore } from "@/store/useAuthStore"
import { publicProfilePath } from "@/lib/profileRoutes"
import * as authService from "@/services/authService"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Menu, Plus, LayoutDashboard, Shield, User, Bell, LogOut, MessageSquare } from "lucide-react"

const linkClass =
  "flex w-full items-center gap-2 rounded-xl px-4 py-3 text-start transition-colors hover:bg-accent"

function MobileNavSheetContent({ t, showBottomNav, token, user, isAdmin, onClose, navigate, queryClient }) {
  const memberProfileHref = publicProfilePath(user) ?? "/dashboard"
  return (
    <div className="flex flex-col gap-1">
      {!showBottomNav && (
        <>
          <Button variant="ghost" size="sm" asChild className={linkClass}>
            <Link to="/" onClick={onClose}>
              {t("common.brandName")}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className={linkClass}>
            <Link to="/add" onClick={onClose} className="flex items-center gap-2">
              <Plus className="size-4" />
              {t("nav.addListing")}
            </Link>
          </Button>
        </>
      )}
      {token && user ? (
        <>
          {isAdmin ? (
            <Button variant="ghost" size="sm" asChild className={linkClass}>
              <Link to="/admin" onClick={onClose} className="flex items-center gap-2">
                <Shield className="size-4" />
                {t("dashboard.admin")}
              </Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" asChild className={linkClass}>
              <Link to="/dashboard" onClick={onClose} className="flex items-center gap-2">
                <LayoutDashboard className="size-4" />
                {t("dashboard.overview")}
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild className={linkClass}>
            <Link to={memberProfileHref} onClick={onClose} className="flex items-center gap-2">
              <User className="size-4" />
              {t("nav.profile", "Profile")}
            </Link>
          </Button>
          {!showBottomNav && (
            <Button variant="ghost" size="sm" asChild className={linkClass}>
              <Link
                to={isAdmin ? "/admin/notifications" : "/dashboard/notifications"}
                onClick={onClose}
                className="flex items-center gap-2"
              >
                <Bell className="size-4" />
                {t("notifications.title", "Notifications")}
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={`${linkClass} text-destructive`}
            onClick={() => {
              authService.performLogout({ navigate, replaceTo: "/", queryClient })
              onClose()
            }}
          >
            <LogOut className="size-4" />
            {t("auth.logout")}
          </Button>
        </>
      ) : (
        <>
          <Button variant="ghost" size="sm" asChild className={linkClass}>
            <Link to="/login" onClick={onClose}>
              {t("common.login")}
            </Link>
          </Button>
          <Button size="sm" asChild className={linkClass}>
            <Link to="/register" onClick={onClose}>
              {t("common.register")}
            </Link>
          </Button>
        </>
      )}
    </div>
  )
}

export function TopNavigation() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, token } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAdmin = user && ["admin", "super_admin", "manager", "employee"].includes(user.role)

  const showBottomNav = token && user

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background text-foreground">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6">
        {/* Mobile: logo only on start */}
        <Link
          to="/"
          className="focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg shrink-0 min-w-0 flex flex-col items-start leading-tight"
        >
          <span className="truncate text-lg font-bold tracking-tight text-primary sm:text-xl md:text-2xl">
            {t("common.brandLogoEn")}
          </span>
          <span className="truncate text-base font-bold text-foreground sm:text-lg md:text-xl">
            {t("common.brandLogoAr")}
          </span>
        </Link>

        {/* Mobile: theme + lang + burger grouped together */}
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" aria-label={t("nav.menu")}>
                <Menu className="size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="start" className="flex flex-col gap-0 p-0 w-[min(320px,85vw)] sm:max-w-sm">
              <SheetHeader className="border-b px-4 py-4">
                <SheetTitle className="text-start">{t("nav.menu")}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-1 flex-col gap-0 overflow-y-auto p-4">
                <MobileNavSheetContent
                  t={t}
                  showBottomNav={showBottomNav}
                  token={token}
                  user={user}
                  isAdmin={isAdmin}
                  onClose={() => setMobileOpen(false)}
                  navigate={navigate}
                  queryClient={queryClient}
                />
              </nav>
            </SheetContent>
          </Sheet>
          {/* Desktop: messages, notifications, profile/auth (hidden on mobile, profile is in sheet) */}
          <div className="hidden lg:flex items-center gap-1">
            {token && user ? (
              <>
                <Button variant="ghost" size="icon" asChild className="relative">
                  <Link to={isAdmin ? "/admin/messages" : "/dashboard/messages"} title={t("dashboard.messages", "الرسائل")}>
                    <MessageSquare className="size-5" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" asChild className="relative">
                  <Link to={isAdmin ? "/admin/notifications" : "/dashboard/notifications"} title={t("notifications.title", "الإشعارات")}>
                    <Bell className="size-5" />
                  </Link>
                </Button>
                <UserMenu />
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="rounded-full">
                  <Link to="/login">{t("common.login")}</Link>
                </Button>
                <Button size="sm" asChild className="rounded-full">
                  <Link to="/register">{t("common.register")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

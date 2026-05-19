/**
 * Build breadcrumb items for dashboard / admin shells (React Router paths).
 * @param {{ pathname: string; isAdmin: boolean; t: (key: string, opt?: string | object) => string }} args
 * @returns {Array<{ to?: string; label: string }>}
 */
export function getBreadcrumbItemsFromPath({ pathname, isAdmin, t }) {
  const path = pathname.replace(/\/+$/, "") || "/"
  const items = [{ to: "/", label: t("nav.home") }]

  if (isAdmin) {
    items.push({ to: "/admin", label: t("breadcrumb.adminHub") })
    const tail = resolveAdminTail(path, t)
    if (tail) items.push(tail)
  } else {
    items.push({ to: "/dashboard", label: t("breadcrumb.memberHub") })
    const tail = resolveMemberTail(path, t)
    if (tail) items.push(tail)
  }

  const last = items.length - 1
  return items.map((it, i) => (i === last ? { label: it.label } : { to: it.to, label: it.label }))
}

function resolveMemberTail(path, t) {
  if (path === "/dashboard") return null

  if (/^\/dashboard\/orders\/[^/]+$/.test(path)) {
    const id = path.split("/").pop()
    return { label: t("breadcrumb.orderDetail", { id }) }
  }
  if (path.startsWith("/dashboard/orders")) {
    return { to: "/dashboard/orders", label: t("dashboard.nav.orderCenter") }
  }
  if (path.startsWith("/dashboard/wallet")) {
    return { to: "/dashboard/wallet", label: t("dashboard.nav.wallet") }
  }
  if (path.startsWith("/dashboard/messages")) {
    return { to: "/dashboard/messages", label: t("dashboard.nav.inbox") }
  }
  if (path.startsWith("/dashboard/account")) {
    return { to: "/dashboard/account", label: t("dashboard.nav.account") }
  }
  if (
    path.startsWith("/dashboard/profile") ||
    path.startsWith("/dashboard/verification") ||
    path.startsWith("/dashboard/reports") ||
    path.startsWith("/dashboard/reviews")
  ) {
    return { to: "/dashboard/account", label: t("dashboard.nav.account") }
  }
  if (path.startsWith("/dashboard/listings") || path.startsWith("/dashboard/wholesale")) {
    return { to: "/dashboard/listings", label: t("dashboard.nav.listings") }
  }
  if (path.startsWith("/dashboard/help")) {
    return { to: "/dashboard/help", label: t("dashboard.nav.help") }
  }

  return { label: t("breadcrumb.fallbackPage") }
}

function resolveAdminTail(path, t) {
  if (path === "/admin") return null

  if (/^\/admin\/orders\/[^/]+$/.test(path)) {
    const id = path.split("/").pop()
    return { label: t("breadcrumb.adminOrderDetail", { id }) }
  }
  if (path.startsWith("/admin/orders")) {
    return { to: "/admin/orders", label: t("admin.ordersTitle") }
  }
  if (/^\/admin\/bids\/[^/]+$/.test(path)) {
    const id = path.split("/").pop()
    return { label: t("admin.bidDetails", { id }) }
  }
  if (path.startsWith("/admin/bids")) {
    return { to: "/admin/bids", label: t("admin.bidsTitle") }
  }
  if (path.startsWith("/admin/charges")) {
    return { to: "/admin/charges", label: t("admin.chargeRequests") }
  }
  if (path.startsWith("/admin/withdrawals")) {
    return { to: "/admin/withdrawals", label: t("admin.withdrawals") }
  }
  if (path.startsWith("/admin/financial-guarantees")) {
    return { to: "/admin/financial-guarantees", label: t("admin.financialGuaranteesTitle") }
  }
  if (path.startsWith("/admin/guarantee-requests")) {
    return { to: "/admin/guarantee-requests", label: t("admin.guaranteeRequestsTitle") }
  }
  if (path.startsWith("/admin/products")) {
    return { to: "/admin/products", label: t("admin.offersAndRequests") }
  }
  if (path.startsWith("/admin/users")) {
    return { to: "/admin/users", label: t("dashboard.users") }
  }
  if (path.startsWith("/admin/categories")) {
    return { to: "/admin/categories", label: t("dashboard.categories") }
  }
  if (path.startsWith("/admin/regions")) {
    return { to: "/admin/regions", label: t("admin.regions") }
  }
  if (path.startsWith("/admin/tasks")) {
    return { to: "/admin/tasks", label: t("admin.tasks") }
  }
  if (path.startsWith("/admin/contact-inquiries")) {
    return { to: "/admin/contact-inquiries", label: t("admin.contactInquiries") }
  }
  if (path.startsWith("/admin/profile-reports")) {
    return { to: "/admin/profile-reports", label: t("admin.profileReports") }
  }
  if (path.startsWith("/admin/listing-reports")) {
    return { to: "/admin/listing-reports", label: t("admin.listingReports") }
  }
  if (path.startsWith("/admin/announcements")) {
    return { to: "/admin/announcements", label: t("admin.announcements") }
  }
  if (path.startsWith("/admin/notifications")) {
    return { to: "/admin/notifications", label: t("notifications.title") }
  }
  if (path.startsWith("/admin/messages")) {
    return { to: "/admin/messages", label: t("admin.messagesTitle") }
  }
  if (path.startsWith("/admin/visitors")) {
    return { to: "/admin/visitors", label: t("admin.visitorsTitle") }
  }
  if (path.startsWith("/admin/roles")) {
    return { to: "/admin/roles", label: t("admin.roles") }
  }
  if (path.startsWith("/admin/analytics")) {
    return { to: "/admin/analytics", label: t("analytics.title") }
  }
  if (path.startsWith("/admin/verifications")) {
    return { to: "/admin/verifications", label: t("admin.verifications") }
  }
  if (path.startsWith("/admin/audit")) {
    return { to: "/admin/audit", label: t("dashboard.auditLogs") }
  }

  return { label: t("breadcrumb.fallbackPage") }
}

/**
 * Breadcrumbs for public profile route `/profile/:identifier`.
 * @param {{ username?: string | null; isAuthenticated: boolean; t: (key: string, opt?: string | object) => string }} args
 */
export function getPublicProfileBreadcrumbItems({ username, isAuthenticated, t }) {
  const items = [{ to: "/", label: t("nav.home") }]
  if (isAuthenticated) {
    items.push({ to: "/dashboard", label: t("breadcrumb.myAccount") })
  }
  const display = username?.trim() || t("nav.profile")
  items.push({ label: display })
  const last = items.length - 1
  return items.map((it, i) => (i === last ? { label: it.label } : { to: it.to, label: it.label }))
}

import { createBrowserRouter, Navigate, Outlet, useParams } from "react-router-dom"
import { ViewRequestsLegacyRedirect } from "@/components/routing/ViewRequestsLegacyRedirect"
import { ErrorFallback } from "@/components/ErrorBoundary"
import { ScrollToTop } from "@/components/ScrollToTop"
import { DemoBanner } from "@/components/DemoBanner"
import { VisitorTracker } from "@/components/visitors/VisitorTracker"
import { AppLayout } from "@/components/layout/AppLayout"
import { Footer } from "@/components/layout/Footer"
import { TopNavigation } from "@/components/navigation/TopNavigation"
import { BottomNavBar } from "@/components/layout/BottomNavBar"
import { useAuthStore } from "@/store/useAuthStore"
import { HomePage } from "@/pages/HomePage"
import { LoginPage } from "@/pages/LoginPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { AddOfferPage } from "@/pages/AddOfferPage"
import { ProductDetailsPage } from "@/pages/ProductDetailsPage"
import { PurchasePage } from "@/pages/PurchasePage"
import { AdminLayout } from "@/layouts/AdminLayout"
import { AuthLayout } from "@/layouts/AuthLayout"
import { RegisterLayout } from "@/layouts/RegisterLayout"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { DashboardShell } from "@/layouts/DashboardShell"
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage"
import { AdminCategoriesPage } from "@/pages/admin/AdminCategoriesPage"
import { AdminCategorySchemasPage } from "@/pages/admin/AdminCategorySchemasPage"
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage"
import { AdminUserDetailPage } from "@/pages/admin/AdminUserDetailPage"
import { AdminAuditPage } from "@/pages/admin/AdminAuditPage"
import { AdminProductsPage } from "@/pages/admin/AdminProductsPage"
import { AdminRegionsPage } from "@/pages/admin/AdminRegionsPage"
import { AdminRolesPage } from "@/pages/admin/AdminRolesPage"
import { AdminAssistantsPage } from "@/pages/admin/AdminAssistantsPage"
import { AdminTasksPage } from "@/pages/admin/AdminTasksPage"
import { AdminAnalyticsPage } from "@/pages/admin/AdminAnalyticsPage"
import { AdminVerificationsPage } from "@/pages/admin/AdminVerificationsPage"
import { AdminCompaniesPage } from "@/pages/admin/AdminCompaniesPage"
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage"
import { AdminOrderDetailPage } from "@/pages/admin/AdminOrderDetailPage"
import { AdminBidsPage } from "@/pages/admin/AdminBidsPage"
import { AdminBidDetailPage } from "@/pages/admin/AdminBidDetailPage"
import { AdminContactInquiriesPage } from "@/pages/admin/AdminContactInquiriesPage"
import { AdminAnnouncementsPage } from "@/pages/admin/AdminAnnouncementsPage"
import { AdminMessagesPage } from "@/pages/admin/AdminMessagesPage"
import { AdminVisitorsPage } from "@/pages/admin/AdminVisitorsPage"
import { AdminListingReportsPage } from "@/pages/admin/AdminListingReportsPage"
import { AdminProfileReportsPage } from "@/pages/admin/AdminProfileReportsPage"
import { AdminWithdrawalsPage } from "@/pages/admin/AdminWithdrawalsPage"
import { AdminChargeRequestsPage } from "@/pages/admin/AdminChargeRequestsPage"
import { AdminFinancialGuaranteesPage } from "@/pages/admin/AdminFinancialGuaranteesPage"
import { AdminGuaranteeRequestsPage } from "@/pages/admin/AdminGuaranteeRequestsPage"
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage"
import { AdminFinancialOpsPage } from "@/pages/admin/AdminFinancialOpsPage"
import { DashboardHome } from "@/pages/dashboard/DashboardHome"
import { OrderDetailPage } from "@/pages/dashboard/OrderDetailPage"
import { MyListingsPage } from "@/pages/dashboard/MyListingsPage"
import { MessagesPage } from "@/pages/dashboard/MessagesPage"
import { NotificationsPage } from "@/pages/dashboard/NotificationsPage"
import { OrderTrackingPage } from "@/pages/dashboard/OrderTrackingPage"
import { NotificationDetailPage } from "@/pages/dashboard/NotificationDetailPage"
import { HelpPage } from "@/pages/dashboard/HelpPage"
import { SellerBidsPage } from "@/pages/dashboard/SellerBidsPage"
import { PublicProfilePage } from "@/pages/PublicProfilePage"
import { WalletHubPage } from "@/pages/dashboard/WalletHubPage"
import { PaymentSetupPage } from "@/pages/dashboard/PaymentSetupPage"
import { AdminFinanceHubPage } from "@/pages/admin/AdminFinanceHubPage"
import { AccountHubPage } from "@/pages/dashboard/AccountHubPage"
import { WholesaleMarketPage } from "@/pages/WholesaleMarketPage"
import { WholesaleMyReservationsPage } from "@/pages/WholesaleMyReservationsPage"
import { WholesaleCheckoutPage } from "@/pages/WholesaleCheckoutPage"
import { WholesaleCompaniesPage } from "@/pages/WholesaleCompaniesPage"
import { WholesaleCompanyPage } from "@/pages/WholesaleCompanyPage"
import { WholesaleProductPage } from "@/pages/WholesaleProductPage"
import { CompanyServicesPage } from "@/pages/dashboard/CompanyServicesPage"
import { MapsTestPage } from "@/pages/MapsTestPage"
import { MapPage } from "@/pages/MapPage"
import { ListingsMapPage } from "@/pages/ListingsMapPage"
import { ContactPage } from "@/pages/ContactPage"
import { LegalPage } from "@/pages/LegalPage"
import { CategoryHomeRedirect } from "@/pages/CategoryHomeRedirect"
import { RequestsPage } from "@/pages/RequestsPage"
import { AdminSeoLayout } from "@/layouts/AdminSeoLayout"
import { AdminSeoDashboardPage } from "@/pages/admin/seo/AdminSeoDashboardPage"
import { AdminSeoGlobalPage } from "@/pages/admin/seo/AdminSeoGlobalPage"
import { AdminSeoPagesPage } from "@/pages/admin/seo/AdminSeoPagesPage"
import { AdminSeoBulkPage } from "@/pages/admin/seo/AdminSeoBulkPage"
import { AdminSeoStructuredDataPage } from "@/pages/admin/seo/AdminSeoStructuredDataPage"
import { AdminSeoSitemapPage } from "@/pages/admin/seo/AdminSeoSitemapPage"
import { AdminSeoRobotsPage } from "@/pages/admin/seo/AdminSeoRobotsPage"
import { AdminSeoSocialPreviewPage } from "@/pages/admin/seo/AdminSeoSocialPreviewPage"
import { AdminSeoReportsPage } from "@/pages/admin/seo/AdminSeoReportsPage"
import { SeoHead } from "@/components/seo/SeoHead"

function RedirectMemberNotificationDetail() {
  const { notificationId } = useParams()
  const id = encodeURIComponent(String(notificationId ?? ""))
  return <Navigate to={`/dashboard/messages?hub=notifications&nid=${id}`} replace />
}

function MainLayout() {
  const { token, user } = useAuthStore()
  const isAuthenticated = Boolean(token && user)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <VisitorTracker />
      <TopNavigation />
      <DemoBanner />
      <main className={`flex-1 ${isAuthenticated ? "pb-20 lg:pb-0" : ""}`}>
        <AppLayout>
          <Outlet />
        </AppLayout>
      </main>
      <Footer />
      {isAuthenticated && <BottomNavBar />}
    </div>
  )
}

function RouteScrollWrapper({ children }) {
  return (
    <>
      <ScrollToTop />
      {children}
    </>
  )
}

const ADMIN_ROLES = ["super_admin", "admin", "manager", "employee", "moderator", "assistant"]

function ProtectedRoute({ children, roles, userOnly, adminOnly }) {
  const { user, token, _hasHydrated } = useAuthStore()
  if (!_hasHydrated) {
    return null
  }
  if (!token || !user) {
    return <Navigate to="/login" replace />
  }
  const isAdmin = ADMIN_ROLES.includes(user.role)
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />
  if (userOnly && isAdmin) return <Navigate to="/admin" replace />
  if (roles && !roles.includes(user.role) && user.role !== "super_admin") {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RouteScrollWrapper>
        <MainLayout />
      </RouteScrollWrapper>
    ),
    errorElement: <ErrorFallback />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "category/:slug", element: <CategoryHomeRedirect /> },
      { path: "requests", element: <RequestsPage /> },
      { path: "add", element: <AddOfferPage /> },
      { path: "add-listing", element: <Navigate to="/add" replace /> },
      { path: "products/:id/edit", element: <ProtectedRoute><AddOfferPage /></ProtectedRoute> },
      { path: "products/:id/purchase", element: <ProtectedRoute><PurchasePage /></ProtectedRoute> },
      { path: "products/:id", element: <ProductDetailsPage /> },
      { path: "wholesale", element: <WholesaleMarketPage /> },
      { path: "wholesale/companies", element: <WholesaleCompaniesPage /> },
      { path: "wholesale/company/:id", element: <WholesaleCompanyPage /> },
      { path: "wholesale/product/:id", element: <WholesaleProductPage /> },
      { path: "wholesale/reservations", element: <ProtectedRoute><WholesaleMyReservationsPage /></ProtectedRoute> },
      { path: "wholesale/checkout/:reservationId", element: <ProtectedRoute><WholesaleCheckoutPage /></ProtectedRoute> },
      {
        path: "services",
        element: <Navigate to={{ pathname: "/", search: "?cat=services" }} replace />,
      },
      {
        path: "services/provider/:id",
        element: <Navigate to={{ pathname: "/", search: "?cat=services" }} replace />,
      },
      // maps-test and map must stay before profile/:identifier (else /maps-test matches as profile slug)
      { path: "maps-test", element: <MapsTestPage /> },
      { path: "map", element: <MapPage /> },
      { path: "listings/map", element: <ListingsMapPage /> },
      { path: "contact", element: <ContactPage /> },
      { path: "privacy-policy", element: <LegalPage slug="privacy-policy" /> },
      { path: "terms", element: <LegalPage slug="terms" /> },
      { path: "refund-policy", element: <LegalPage slug="refund-policy" /> },
      { path: "payment-policy", element: <LegalPage slug="payment-policy" /> },
      { path: "listing-policy", element: <LegalPage slug="listing-policy" /> },
      { path: "safety", element: <LegalPage slug="safety" /> },
      { path: "fees", element: <LegalPage slug="fees" /> },
      { path: "about", element: <LegalPage slug="about" /> },
      { path: "help", element: <LegalPage slug="help" /> },
      { path: "profile/:identifier", element: <PublicProfilePage /> },
    ],
  },
  {
    path: "/login",
    element: (
      <RouteScrollWrapper>
        <RegisterLayout />
      </RouteScrollWrapper>
    ),
    children: [
      { index: true, element: <LoginPage /> },
    ],
  },
  {
    path: "/register",
    element: (
      <RouteScrollWrapper>
        <RegisterLayout />
      </RouteScrollWrapper>
    ),
    children: [
      { index: true, element: <RegisterPage /> },
    ],
  },
  {
    path: "/dashboard",
    element: (
      <RouteScrollWrapper>
        <ProtectedRoute userOnly>
          <div className="flex min-h-screen flex-col pb-20 lg:pb-0">
            <DashboardShell>
              <DashboardLayout />
            </DashboardShell>
            <BottomNavBar />
          </div>
        </ProtectedRoute>
      </RouteScrollWrapper>
    ),
    errorElement: <ErrorFallback />,
    children: [
      { index: true, element: <DashboardHome /> },
      { path: "orders", element: <OrderTrackingPage /> },
      { path: "orders/:id", element: <OrderDetailPage /> },
      { path: "view-requests", element: <ViewRequestsLegacyRedirect /> },
      { path: "bids", element: <Navigate to="/dashboard/orders?section=bids" replace /> },
      { path: "seller-bids", element: <SellerBidsPage /> },
      { path: "wallet", element: <WalletHubPage /> },
      { path: "payment-setup", element: <PaymentSetupPage /> },
      { path: "balance", element: <Navigate to="/dashboard/wallet" replace /> },
      { path: "guarantee", element: <Navigate to="/dashboard/wallet?tab=guarantee" replace /> },
      { path: "listings", element: <MyListingsPage /> },
      { path: "favorites", element: <Navigate to="/dashboard" replace /> },
      { path: "saved-searches", element: <Navigate to="/dashboard" replace /> },
      { path: "messages", element: <MessagesPage /> },
      { path: "notifications/:notificationId", element: <RedirectMemberNotificationDetail /> },
      { path: "notifications", element: <Navigate to="/dashboard/messages?hub=notifications" replace /> },
      { path: "profile", element: <Navigate to="/dashboard/account?tab=profile" replace /> },
      { path: "views", element: <Navigate to="/dashboard/account" replace /> },
      { path: "reports", element: <Navigate to="/dashboard/account?tab=reports" replace /> },
      { path: "wholesale", element: <Navigate to="/dashboard/listings?channel=wholesale" replace /> },
      { path: "services", element: <CompanyServicesPage /> },
      { path: "account", element: <AccountHubPage /> },
      { path: "help", element: <HelpPage /> },
      { path: "reviews", element: <Navigate to="/dashboard/account" replace /> },
      { path: "verification", element: <Navigate to="/dashboard/account?tab=verification" replace /> },
    ],
  },
  {
    path: "/admin",
    element: (
      <RouteScrollWrapper>
        <ProtectedRoute adminOnly>
          <DashboardShell>
            <AdminLayout />
          </DashboardShell>
        </ProtectedRoute>
      </RouteScrollWrapper>
    ),
    errorElement: <ErrorFallback />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "orders", element: <AdminOrdersPage /> },
      {
        path: "bids",
        element: (
          <ProtectedRoute adminOnly roles={["super_admin", "admin"]}>
            <AdminBidsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "bids/:id",
        element: (
          <ProtectedRoute adminOnly roles={["super_admin", "admin"]}>
            <AdminBidDetailPage />
          </ProtectedRoute>
        ),
      },
      { path: "finance", element: <AdminFinanceHubPage /> },
      {
        path: "finance-ops",
        element: (
          <ProtectedRoute adminOnly roles={["super_admin", "admin"]}>
            <AdminFinancialOpsPage />
          </ProtectedRoute>
        ),
      },
      { path: "charges", element: <AdminChargeRequestsPage /> },
      { path: "withdrawals", element: <AdminWithdrawalsPage /> },
      { path: "financial-guarantees", element: <AdminFinancialGuaranteesPage /> },
      { path: "guarantee-requests", element: <AdminGuaranteeRequestsPage /> },
      { path: "settings", element: <AdminSettingsPage /> },
      { path: "orders/:id", element: <AdminOrderDetailPage /> },
      { path: "products", element: <AdminProductsPage /> },
      { path: "categories", element: <AdminCategoriesPage /> },
      { path: "category-schemas", element: <AdminCategorySchemasPage /> },
      { path: "regions", element: <AdminRegionsPage /> },
      { path: "users", element: <AdminUsersPage /> },
      { path: "users/:id", element: <AdminUserDetailPage /> },
      { path: "tasks", element: <AdminTasksPage /> },
      { path: "contact-inquiries", element: <AdminContactInquiriesPage /> },
      { path: "listing-reports", element: <AdminListingReportsPage /> },
      { path: "profile-reports", element: <AdminProfileReportsPage /> },
      { path: "profile-reports/:reportId", element: <AdminProfileReportsPage /> },
      { path: "announcements", element: <AdminAnnouncementsPage /> },
      { path: "notifications/:notificationId", element: <NotificationDetailPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "messages", element: <AdminMessagesPage /> },
      { path: "visitors", element: <AdminVisitorsPage /> },
      { path: "roles", element: <AdminRolesPage /> },
      { path: "assistants", element: <AdminAssistantsPage /> },
      { path: "audit", element: <AdminAuditPage /> },
      { path: "analytics", element: <AdminAnalyticsPage /> },
      { path: "verifications", element: <AdminVerificationsPage /> },
      { path: "companies", element: <AdminCompaniesPage /> },
      { path: "security", element: <Navigate to="/admin/settings" replace /> },
      {
        path: "seo",
        element: (
          <>
            <SeoHead path="/admin/seo" noindex />
            <AdminSeoLayout />
          </>
        ),
        children: [
          { index: true, element: <AdminSeoDashboardPage /> },
          { path: "global", element: <AdminSeoGlobalPage /> },
          { path: "pages", element: <AdminSeoPagesPage /> },
          { path: "pages/bulk", element: <AdminSeoBulkPage /> },
          { path: "structured-data", element: <AdminSeoStructuredDataPage /> },
          { path: "sitemap", element: <AdminSeoSitemapPage /> },
          { path: "robots", element: <AdminSeoRobotsPage /> },
          { path: "social-preview", element: <AdminSeoSocialPreviewPage /> },
          { path: "reports", element: <AdminSeoReportsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
])

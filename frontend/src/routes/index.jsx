import { createBrowserRouter, Navigate, Outlet } from "react-router-dom"
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
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage"
import { AdminUserDetailPage } from "@/pages/admin/AdminUserDetailPage"
import { AdminAuditPage } from "@/pages/admin/AdminAuditPage"
import { AdminProductsPage } from "@/pages/admin/AdminProductsPage"
import { AdminRegionsPage } from "@/pages/admin/AdminRegionsPage"
import { AdminRolesPage } from "@/pages/admin/AdminRolesPage"
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
import { DashboardHome } from "@/pages/dashboard/DashboardHome"
import { OrderDetailPage } from "@/pages/dashboard/OrderDetailPage"
import { MyListingsPage } from "@/pages/dashboard/MyListingsPage"
import { BuyerFavoritesPage } from "@/pages/dashboard/BuyerFavoritesPage"
import { SavedSearchesPage } from "@/pages/dashboard/SavedSearchesPage"
import { MessagesPage } from "@/pages/dashboard/MessagesPage"
import { DashboardProfilePage } from "@/pages/dashboard/DashboardProfilePage"
import { DashboardViewsPage } from "@/pages/dashboard/DashboardViewsPage"
import { DashboardReportsPage } from "@/pages/dashboard/DashboardReportsPage"
import { AccountSettingsPage } from "@/pages/dashboard/AccountSettingsPage"
import { OrderTrackingPage } from "@/pages/dashboard/OrderTrackingPage"
import { BalancePage } from "@/pages/dashboard/BalancePage"
import { GuaranteePage } from "@/pages/dashboard/GuaranteePage"
import { VerificationPage } from "@/pages/dashboard/VerificationPage"
import { NotificationsPage } from "@/pages/dashboard/NotificationsPage"
import { NotificationDetailPage } from "@/pages/dashboard/NotificationDetailPage"
import { HelpPage } from "@/pages/dashboard/HelpPage"
import { MyReviewsPage } from "@/pages/dashboard/MyReviewsPage"
import { ViewRequestsPage } from "@/pages/dashboard/ViewRequestsPage"
import { MyBidsPage } from "@/pages/dashboard/MyBidsPage"
import { SellerBidsPage } from "@/pages/dashboard/SellerBidsPage"
import { PublicProfilePage } from "@/pages/PublicProfilePage"
import { CompanyWholesalePage } from "@/pages/dashboard/CompanyWholesalePage"
import { WholesaleMarketPage } from "@/pages/WholesaleMarketPage"
import { WholesaleMyReservationsPage } from "@/pages/WholesaleMyReservationsPage"
import { WholesaleCheckoutPage } from "@/pages/WholesaleCheckoutPage"
import { WholesaleCompaniesPage } from "@/pages/WholesaleCompaniesPage"
import { WholesaleCompanyPage } from "@/pages/WholesaleCompanyPage"
import { WholesaleProductPage } from "@/pages/WholesaleProductPage"

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

const ADMIN_ROLES = ["super_admin", "admin", "manager", "employee", "moderator"]

function ProtectedRoute({ children, roles, userOnly, adminOnly }) {
  const { user, token } = useAuthStore()
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
      { path: "view-requests", element: <ViewRequestsPage /> },
      { path: "bids", element: <MyBidsPage /> },
      { path: "seller-bids", element: <SellerBidsPage /> },
      { path: "balance", element: <BalancePage /> },
      { path: "guarantee", element: <GuaranteePage /> },
      { path: "listings", element: <MyListingsPage /> },
      { path: "favorites", element: <BuyerFavoritesPage /> },
      { path: "saved-searches", element: <SavedSearchesPage /> },
      { path: "messages", element: <MessagesPage /> },
      { path: "notifications/:notificationId", element: <NotificationDetailPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "profile", element: <DashboardProfilePage /> },
      { path: "views", element: <DashboardViewsPage /> },
      { path: "reports", element: <DashboardReportsPage /> },
      { path: "wholesale", element: <CompanyWholesalePage /> },
      { path: "account", element: <AccountSettingsPage /> },
      { path: "help", element: <HelpPage /> },
      { path: "reviews", element: <MyReviewsPage /> },
      { path: "verification", element: <VerificationPage /> },
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
      { path: "charges", element: <AdminChargeRequestsPage /> },
      { path: "withdrawals", element: <AdminWithdrawalsPage /> },
      { path: "financial-guarantees", element: <AdminFinancialGuaranteesPage /> },
      { path: "guarantee-requests", element: <AdminGuaranteeRequestsPage /> },
      { path: "settings", element: <AdminSettingsPage /> },
      { path: "orders/:id", element: <AdminOrderDetailPage /> },
      { path: "products", element: <AdminProductsPage /> },
      { path: "categories", element: <AdminCategoriesPage /> },
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
      { path: "audit", element: <AdminAuditPage /> },
      { path: "analytics", element: <AdminAnalyticsPage /> },
      { path: "verifications", element: <AdminVerificationsPage /> },
      { path: "companies", element: <AdminCompaniesPage /> },
      { path: "security", element: <Navigate to="/admin/settings" replace /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
])

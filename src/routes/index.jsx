import { createBrowserRouter, Navigate, Outlet } from "react-router-dom"
import { ErrorFallback } from "@/components/ErrorBoundary"
import { AnnouncementBanner } from "@/components/announcements/AnnouncementBanner"
import { DemoBanner } from "@/components/DemoBanner"
import { VisitorTracker } from "@/components/visitors/VisitorTracker"
import { AppLayout } from "@/components/layout/AppLayout"
import { Footer } from "@/components/layout/Footer"
import { TopNavigation } from "@/components/navigation/TopNavigation"
import { useAuthStore } from "@/store/useAuthStore"
import { HomePage } from "@/pages/HomePage"
import { LoginPage } from "@/pages/LoginPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage"
import { VerifyEmailPage } from "@/pages/VerifyEmailPage"
import { AddOfferPage } from "@/pages/AddOfferPage"
import { EditOfferPage } from "@/pages/EditOfferPage"
import { ProductDetailsPage } from "@/pages/ProductDetailsPage"
import { PurchasePage } from "@/pages/PurchasePage"
import { AdminLayout } from "@/layouts/AdminLayout"
import { AuthLayout } from "@/layouts/AuthLayout"
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
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage"
import { AdminOrderDetailPage } from "@/pages/admin/AdminOrderDetailPage"
import { AdminContactInquiriesPage } from "@/pages/admin/AdminContactInquiriesPage"
import { AdminAnnouncementsPage } from "@/pages/admin/AdminAnnouncementsPage"
import { AdminMessagesPage } from "@/pages/admin/AdminMessagesPage"
import { AdminVisitorsPage } from "@/pages/admin/AdminVisitorsPage"
import { DashboardOverviewPage } from "@/pages/dashboard/DashboardOverviewPage"
import { SellerListingsPage } from "@/pages/dashboard/SellerListingsPage"
import { BuyerFavoritesPage } from "@/pages/dashboard/BuyerFavoritesPage"
import { SavedSearchesPage } from "@/pages/dashboard/SavedSearchesPage"
import { MessagesPage } from "@/pages/dashboard/MessagesPage"
import { DashboardProfilePage } from "@/pages/dashboard/DashboardProfilePage"
import { OrderTrackingPage } from "@/pages/dashboard/OrderTrackingPage"
import { BalancePage } from "@/pages/dashboard/BalancePage"
import { VerificationPage } from "@/pages/dashboard/VerificationPage"
import { NotificationsPage } from "@/pages/dashboard/NotificationsPage"
import { UserProfilePage } from "@/pages/UserProfilePage"

function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <VisitorTracker />
      <TopNavigation />
      <DemoBanner />
      <AnnouncementBanner />
      <main className="flex-1">
        <AppLayout>
          <Outlet />
        </AppLayout>
      </main>
      <Footer />
    </div>
  )
}

const ADMIN_ROLES = ["super_admin", "admin", "manager", "employee"]

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
    element: <MainLayout />,
    errorElement: <ErrorFallback />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "add", element: <ProtectedRoute><AddOfferPage /></ProtectedRoute> },
      { path: "products/:id/edit", element: <ProtectedRoute><EditOfferPage /></ProtectedRoute> },
      { path: "products/:id/purchase", element: <ProtectedRoute><PurchasePage /></ProtectedRoute> },
      { path: "products/:id", element: <ProductDetailsPage /> },
      { path: "users/:id", element: <UserProfilePage /> },
    ],
  },
  {
    path: "/login",
    element: <AuthLayout />,
    children: [
      { index: true, element: <LoginPage /> },
    ],
  },
  {
    path: "/register",
    element: <AuthLayout />,
    children: [
      { index: true, element: <RegisterPage /> },
    ],
  },
  {
    path: "/forgot-password",
    element: <AuthLayout />,
    children: [
      { index: true, element: <ForgotPasswordPage /> },
    ],
  },
  {
    path: "/verify-email",
    element: <AuthLayout />,
    children: [
      { index: true, element: <VerifyEmailPage /> },
    ],
  },
  {
    path: "/dashboard",
    element: <ProtectedRoute userOnly><DashboardShell><DashboardLayout /></DashboardShell></ProtectedRoute>,
    errorElement: <ErrorFallback />,
    children: [
      { index: true, element: <DashboardOverviewPage /> },
      { path: "orders", element: <OrderTrackingPage /> },
      { path: "balance", element: <BalancePage /> },
      { path: "verification", element: <VerificationPage /> },
      { path: "listings", element: <SellerListingsPage /> },
      { path: "favorites", element: <BuyerFavoritesPage /> },
      { path: "saved-searches", element: <SavedSearchesPage /> },
      { path: "messages", element: <MessagesPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "profile", element: <DashboardProfilePage /> },
    ],
  },
  {
    path: "/admin",
    element: <ProtectedRoute adminOnly><DashboardShell><AdminLayout /></DashboardShell></ProtectedRoute>,
    errorElement: <ErrorFallback />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "orders", element: <AdminOrdersPage /> },
      { path: "orders/:id", element: <AdminOrderDetailPage /> },
      { path: "products", element: <AdminProductsPage /> },
      { path: "categories", element: <AdminCategoriesPage /> },
      { path: "regions", element: <AdminRegionsPage /> },
      { path: "users", element: <AdminUsersPage /> },
      { path: "users/:id", element: <AdminUserDetailPage /> },
      { path: "tasks", element: <AdminTasksPage /> },
      { path: "contact-inquiries", element: <AdminContactInquiriesPage /> },
      { path: "announcements", element: <AdminAnnouncementsPage /> },
      { path: "messages", element: <AdminMessagesPage /> },
      { path: "visitors", element: <AdminVisitorsPage /> },
      { path: "roles", element: <AdminRolesPage /> },
      { path: "audit", element: <AdminAuditPage /> },
      { path: "analytics", element: <AdminAnalyticsPage /> },
      { path: "verifications", element: <AdminVerificationsPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
])

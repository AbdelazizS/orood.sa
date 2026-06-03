import { Navigate } from "react-router-dom"
import { useFinanceModules, isBankAccountsUiVisible } from "@/hooks/useFinanceModules"
import { PaymentSetupPage } from "@/pages/dashboard/PaymentSetupPage"
import { Skeleton } from "@/components/ui/skeleton"

export function PaymentSetupRoute() {
  const { data: modules, isLoading } = useFinanceModules()

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!isBankAccountsUiVisible(modules)) {
    return <Navigate to="/dashboard/account" replace />
  }

  return <PaymentSetupPage />
}

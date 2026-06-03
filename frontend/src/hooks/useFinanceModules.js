import { useQuery } from "@tanstack/react-query"
import { fetchFinanceModules } from "@/services/financeService"

export const FINANCE_MODULES_QUERY_KEY = ["finance", "modules"]

export function useFinanceModules() {
  return useQuery({
    queryKey: FINANCE_MODULES_QUERY_KEY,
    queryFn: fetchFinanceModules,
    staleTime: 60_000,
  })
}

export function isWalletNavVisible(modules) {
  return Boolean(modules?.payments_module && modules?.wallet)
}

export function isPaymentsUiVisible(modules) {
  return Boolean(modules?.payments_module)
}

export function isBankAccountsUiVisible(modules) {
  return Boolean(modules?.payments_module && modules?.bank_accounts)
}

export function isFinancialGuaranteeVisible(modules) {
  return Boolean(modules?.payments_module && modules?.financial_guarantee)
}

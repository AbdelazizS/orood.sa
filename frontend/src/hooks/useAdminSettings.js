import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getAdminSettings,
  updateAccountSettings,
  updateAuthSettings,
  updateContentSettings,
  updateSecuritySettings,
  updateWholesaleMarketPageSettings,
  updatePaymentSettings,
  updateContactSettings,
} from "@/services/adminSettingsService"

export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: getAdminSettings,
  })
}

function makeSectionMutation(key, fn) {
  return function useSectionMutation() {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: fn,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "settings"] })
        if (key === "contact") {
          queryClient.invalidateQueries({ queryKey: ["contact-page"] })
        }
        if (key === "security") {
          queryClient.invalidateQueries({ queryKey: ["auth", "password-policy"] })
        }
        if (key === "wholesale_market_page") {
          queryClient.invalidateQueries({ queryKey: ["wholesale", "page-settings"] })
        }
      },
    })
  }
}

export const useUpdateSecuritySettings = makeSectionMutation("security", updateSecuritySettings)
export const useUpdateAccountSettings = makeSectionMutation("account", updateAccountSettings)
export const useUpdateAuthSettings = makeSectionMutation("auth", updateAuthSettings)
export const useUpdateContentSettings = makeSectionMutation("content", updateContentSettings)
export const useUpdateWholesaleMarketPageSettings = makeSectionMutation("wholesale_market_page", updateWholesaleMarketPageSettings)
export const useUpdatePaymentSettings = makeSectionMutation("payments", updatePaymentSettings)
export const useUpdateContactSettings = makeSectionMutation("contact", updateContactSettings)


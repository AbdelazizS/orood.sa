import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getAdminSettings,
  updateAccountSettings,
  updateAuthSettings,
  updateContentSettings,
  updateSecuritySettings,
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
        if (key === "security") {
          queryClient.invalidateQueries({ queryKey: ["auth", "password-policy"] })
        }
      },
    })
  }
}

export const useUpdateSecuritySettings = makeSectionMutation("security", updateSecuritySettings)
export const useUpdateAccountSettings = makeSectionMutation("account", updateAccountSettings)
export const useUpdateAuthSettings = makeSectionMutation("auth", updateAuthSettings)
export const useUpdateContentSettings = makeSectionMutation("content", updateContentSettings)


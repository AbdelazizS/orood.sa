import apiClient from "@/lib/apiClient"

export async function getAdminSettings() {
  const { data } = await apiClient.get("/admin/settings")
  return data?.data ?? {}
}

export async function updateSecuritySettings(payload) {
  const { data } = await apiClient.put("/admin/settings/security", payload)
  return data?.data ?? {}
}

export async function updateAccountSettings(payload) {
  const { data } = await apiClient.put("/admin/settings/account", payload)
  return data?.data ?? {}
}

export async function updateAuthSettings(payload) {
  const { data } = await apiClient.put("/admin/settings/auth", payload)
  return data?.data ?? {}
}

export async function updateContentSettings(payload) {
  const { data } = await apiClient.put("/admin/settings/content", payload)
  return data?.data ?? {}
}

export async function updateWholesaleMarketPageSettings(payload) {
  const { data } = await apiClient.put("/admin/settings/wholesale-market-page", payload)
  return data?.data ?? {}
}

export async function updatePaymentSettings(payload) {
  const { data } = await apiClient.put("/admin/settings/payments", payload)
  return data?.data ?? {}
}

export async function updateContactSettings(payload) {
  const { data } = await apiClient.put("/admin/settings/contact", payload)
  return data?.data ?? {}
}


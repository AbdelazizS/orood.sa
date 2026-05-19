import apiClient from "@/lib/apiClient"

export async function fetchPaymentMethods(context = "checkout", audience) {
  const { data } = await apiClient.get("/payment-methods", {
    params: { context, audience },
  })
  return data?.data ?? []
}

export async function fetchPaymentFields(context, paymentMethodCode) {
  const { data } = await apiClient.get("/payment-methods/fields", {
    params: { context, payment_method_code: paymentMethodCode },
  })
  return data?.data ?? []
}

export async function fetchCheckoutPaymentOptions(productId) {
  const { data } = await apiClient.get(`/products/${productId}/checkout-payment-options`)
  return data?.data ?? []
}

export async function fetchPayoutProfile() {
  const { data } = await apiClient.get("/seller/payout-profile")
  return data?.data
}

export async function savePayoutProfile(payload) {
  const { data } = await apiClient.put("/seller/payout-profile", payload)
  return data
}

export async function fetchPaymentSetupStatus() {
  const { data } = await apiClient.get("/seller/payment-setup-status")
  return data?.data
}

export async function submitFinancialCharge(payload, idempotencyKey) {
  const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}
  const { data } = await apiClient.post("/account/financial-requests/charge", payload, { headers })
  return data
}

export async function submitFinancialWithdraw(payload) {
  const { data } = await apiClient.post("/account/financial-requests/withdraw", payload)
  return data
}

export async function fetchWalletChargeSchema() {
  const { data } = await apiClient.get("/finance/wallet/charge-schema")
  return data?.data ?? { methods: [], currency: "SAR" }
}

export async function fetchWalletWithdrawSchema() {
  const { data } = await apiClient.get("/finance/wallet/withdraw-schema")
  return data?.data ?? { methods: [], currency: "SAR" }
}

export const USE_DYNAMIC_WALLET =
  import.meta.env.VITE_USE_DYNAMIC_WALLET === "true" ||
  import.meta.env.VITE_USE_DYNAMIC_WALLET === "1"

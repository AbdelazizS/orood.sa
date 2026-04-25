import i18n from "i18next"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1"

export async function login(email, password) {
  const { data } = await apiClient.post("/auth/login", { email, password })
  useAuthStore.getState().setAuth(data.user, data.token)
  return data
}

export async function register(payload) {
  const body = {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    password_confirmation: payload.password_confirmation,
  }
  if (payload.phone) body.phone = payload.phone
  if (payload.how_did_you_hear) body.how_did_you_hear = payload.how_did_you_hear
  const { data } = await apiClient.post("/auth/register", body)
  useAuthStore.getState().setAuth(data.user, data.token)
  return data
}

export async function getPasswordPolicy() {
  const { data } = await apiClient.get("/auth/password-policy")
  return data
}

export async function verifyEmail(email) {
  const { data } = await apiClient.post("/auth/verify-email", { email })
  return data
}

export async function confirmEmail(email, code) {
  const { data } = await apiClient.post("/auth/confirm-email", { email, code })
  useAuthStore.getState().setAuth(data.user, data.token)
  return data
}

/**
 * Clear session, navigate away, then revoke the old token on the server (fire-and-forget).
 * Does not block on the network so logout always feels instant.
 */
export function performLogout({ navigate, replaceTo = "/", queryClient } = {}) {
  const prevToken = useAuthStore.getState().token
  useAuthStore.getState().logout()
  queryClient?.clear()

  if (navigate) {
    navigate(replaceTo, { replace: true })
  } else if (typeof window !== "undefined") {
    window.location.replace(replaceTo)
  }

  if (!prevToken) return

  const lang = i18n?.language?.startsWith("ar") ? "ar" : "en"
  const base = API_BASE.replace(/\/$/, "")
  const path = `${base}/auth/logout`
  fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${prevToken}`,
      Accept: "application/json",
      "Accept-Language": lang,
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: "{}",
  }).catch(() => {})
}

/** @deprecated Use performLogout({ navigate }) from components with router access. */
export async function logout() {
  performLogout({ replaceTo: "/" })
}

export async function fetchUser() {
  const { data } = await apiClient.get("/auth/user")
  useAuthStore.getState().setAuth(data.user, useAuthStore.getState().token)
  return data.user
}

export async function forgotPassword(email) {
  const { data } = await apiClient.post("/auth/forgot-password", { email })
  return data
}

export async function registerCompany(payload) {
  const formData = new FormData()
  formData.append("company_name", payload.company_name)
  formData.append("city_id", payload.city_id)
  if (payload.product_types) formData.append("product_types", payload.product_types)
  if (payload.license) formData.append("license", payload.license)

  const { data } = await apiClient.post("/auth/register/company", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export async function getMyCompanyStatus() {
  const { data } = await apiClient.get("/companies/my-status")
  return data?.data ?? null
}

export async function changePassword(currentPassword, password, passwordConfirmation) {
  const { data } = await apiClient.post("/auth/change-password", {
    current_password: currentPassword,
    password,
    password_confirmation: passwordConfirmation,
  })
  return data
}

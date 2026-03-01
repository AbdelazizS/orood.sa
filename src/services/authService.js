import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"

export async function login(email, password) {
  const { data } = await apiClient.post("/auth/login", { email, password })
  useAuthStore.getState().setAuth(data.user, data.token)
  return data
}

export async function register(payload) {
  const { data } = await apiClient.post("/auth/register", {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    password_confirmation: payload.password_confirmation,
  })
  useAuthStore.getState().setAuth(data.user, data.token)
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

export async function logout() {
  try {
    await apiClient.post("/auth/logout")
  } finally {
    useAuthStore.getState().logout()
  }
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

export async function changePassword(currentPassword, password, passwordConfirmation) {
  const { data } = await apiClient.post("/auth/change-password", {
    current_password: currentPassword,
    password,
    password_confirmation: passwordConfirmation,
  })
  return data
}

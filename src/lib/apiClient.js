import axios from "axios"
import i18n from "i18next"
import { useAuthStore } from "@/store/useAuthStore"
import { getDemoResponse } from "./demoApi"

const USE_DEMO = import.meta.env.VITE_USE_DEMO === "true" || import.meta.env.VITE_USE_DEMO === "1"
const API_BASE = import.meta.env.VITE_API_URL || "/api/v1"

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 12000,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const lang = i18n?.language || "ar"
  config.headers["Accept-Language"] = lang.startsWith("ar") ? "ar" : "en"
  return config
})

// Demo mode: intercept requests and return mock data
if (USE_DEMO) {
  apiClient.interceptors.request.use(
    async (config) => {
      const path = (config.url || "").replace(/^\/api\/v1/, "") || "/"
      const normalizedPath = path.startsWith("/") ? path : `/${path}`
      const result = await getDemoResponse(config.method?.toUpperCase() || "GET", normalizedPath, config.params, config.data)
      const err = new Error("Demo")
      err.__demoResponse = result
      err.isDemo = true
      err.config = config
      return Promise.reject(err)
    },
    (err) => Promise.reject(err)
  )
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.isDemo && error?.__demoResponse) {
      return Promise.resolve({
        data: error.__demoResponse,
        status: 200,
        statusText: "OK",
        headers: {},
        config: error.config,
      })
    }
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    if (error.response) {
      console.error("API error:", error.response.data)
    } else if (!error.isDemo) {
      console.error("Network error:", error.message)
    }
    return Promise.reject(error)
  }
)

export default apiClient
export { USE_DEMO }

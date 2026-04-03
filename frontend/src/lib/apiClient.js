import axios from "axios"
import i18n from "i18next"
import { useAuthStore } from "@/store/useAuthStore"
import { getDemoResponse } from "./demoApi"

const USE_DEMO = import.meta.env.VITE_USE_DEMO === "true" || import.meta.env.VITE_USE_DEMO === "1"
const API_BASE = import.meta.env.VITE_API_URL || "/api/v1"

/** Strip HTML appended after JSON (Laravel debug/error output) */
function parseJsonSafe(data) {
  if (typeof data !== "string") return data
  const jsonEnd = data.indexOf("<!")
  const jsonStr = jsonEnd > 0 ? data.slice(0, jsonEnd).trim() : data
  try {
    return JSON.parse(jsonStr)
  } catch {
    return data
  }
}

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  transformResponse: [(data) => (typeof data === "string" ? parseJsonSafe(data) : data)],
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
      let path = (config.url || "").replace(/^\/api\/v1/, "").split("?")[0] || "/"
      if (path.startsWith("http")) {
        try {
          path = new URL(path).pathname.replace(/^\/api\/v1/, "") || "/"
        } catch (_) {}
      }
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
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout:", error.config?.url)
      return Promise.reject(new Error("Request timeout - server may be slow"))
    }
    if (error.response?.status === 404) {
      return Promise.reject(new Error("User not found"))
    }
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
      return Promise.reject(error)
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

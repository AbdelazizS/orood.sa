import axios from "axios"
import i18n from "i18next"
import { useAuthStore } from "@/store/useAuthStore"
import { getDemoResponse } from "./demoApi"

const USE_DEMO = import.meta.env.VITE_USE_DEMO === "true" || import.meta.env.VITE_USE_DEMO === "1"
const API_BASE = import.meta.env.VITE_API_URL || "/api/v1"
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])
const RETRYABLE_METHODS = new Set(["GET"])
const MAX_RETRIES = 2

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
  async (error) => {
    const status = error?.response?.status
    const method = String(error?.config?.method || "GET").toUpperCase()
    const url = String(error?.config?.url || "")
    const isPresence = url.includes("/auth/presence")
    const retryCount = Number(error?.config?.__retryCount || 0)
    const shouldRetry =
      !isPresence &&
      retryCount < MAX_RETRIES &&
      RETRYABLE_METHODS.has(method) &&
      (error?.code === "ECONNABORTED" || !status || RETRYABLE_HTTP_STATUSES.has(status))

    if (shouldRetry) {
      error.config.__retryCount = retryCount + 1
      const delayMs = 300 * 2 ** retryCount
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      return apiClient.request(error.config)
    }

    if (error.code === "ECONNABORTED") {
      console.error("Request timeout:", error.config?.url)
      const timeoutErr = new Error("TIMEOUT")
      timeoutErr.code = "TIMEOUT"
      timeoutErr.isApiTimeout = true
      return Promise.reject(timeoutErr)
    }
    if (error.response?.status === 404) {
      const notFound = new Error("User not found")
      notFound.code = "NOT_FOUND"
      return Promise.reject(notFound)
    }
    if (error?.isDemo && error?.__demoResponse) {
      const raw = error.__demoResponse
      const status = typeof raw?.__demoStatus === "number" ? raw.__demoStatus : 200
      let data
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const { __demoStatus: _ignored, ...rest } = raw
        data = rest
      } else {
        data = raw
      }
      if (status >= 400) {
        return Promise.reject({
          isDemo: true,
          response: { status, data, headers: {}, statusText: "Error" },
          config: error.config,
        })
      }
      return Promise.resolve({
        data,
        status,
        statusText: "OK",
        headers: {},
        config: error.config,
      })
    }
    if (error.response?.status === 401) {
      const url = String(error.config?.url ?? "")
      const isLogoutCall = url.includes("/auth/logout")
      if (!isLogoutCall) {
        useAuthStore.getState().logout()
      }
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

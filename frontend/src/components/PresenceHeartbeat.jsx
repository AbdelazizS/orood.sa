import { useEffect } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import apiClient from "@/lib/apiClient"

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1"
const INTERVAL_MS = 90_000

let lastOfflineSentAt = 0

function presenceOfflineUrl() {
  const path = `${String(API_BASE).replace(/\/$/, "")}/auth/presence/offline`
  if (path.startsWith("http")) {
    return path
  }
  const origin = window.location.origin
  const prefix = path.startsWith("/") ? "" : "/"
  return `${origin}${prefix}${path}`
}

/**
 * Fire-and-forget offline ping (tab close / navigate away). keepalive lets it finish after unload.
 */
function sendPresenceOfflineBeacon() {
  const token = useAuthStore.getState().token
  if (!token) return
  const now = Date.now()
  if (now - lastOfflineSentAt < 1500) return
  lastOfflineSentAt = now
  const lang = (typeof navigator !== "undefined" && navigator.language?.startsWith("ar")) ? "ar" : "en"
  fetch(presenceOfflineUrl(), {
    method: "POST",
    keepalive: true,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Language": lang,
    },
    body: "{}",
  }).catch(() => {})
}

/**
 * Keeps `users.last_seen` fresh for listing hero and profiles (POST /auth/presence).
 * Marks offline on real page unload (not bfcache restore).
 */
export function PresenceHeartbeat() {
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!token) return undefined

    const ping = () => {
      apiClient.post("/auth/presence").catch(() => {})
    }
    ping()
    const intervalId = window.setInterval(ping, INTERVAL_MS)
    const onVisibility = () => {
      if (document.visibilityState === "visible") ping()
    }
    document.addEventListener("visibilitychange", onVisibility)

    const onPageHide = (e) => {
      if (e.persisted) return
      sendPresenceOfflineBeacon()
    }
    window.addEventListener("pagehide", onPageHide)
    window.addEventListener("beforeunload", sendPresenceOfflineBeacon)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pagehide", onPageHide)
      window.removeEventListener("beforeunload", sendPresenceOfflineBeacon)
    }
  }, [token])

  return null
}

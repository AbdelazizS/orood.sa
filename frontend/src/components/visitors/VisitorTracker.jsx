import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import apiClient from "@/lib/apiClient"

const SESSION_KEY = "visitor_session_id"

function getOrCreateSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

function detectSocialChannel(ref) {
  if (!ref || typeof ref !== "string") return undefined
  const u = ref.toLowerCase()
  if (u.includes("whatsapp") || u.includes("wa.me")) return "whatsapp"
  if (u.includes("twitter.com") || u.includes("t.co") || u.includes("x.com")) return "twitter"
  if (u.includes("facebook.com") || u.includes("fb.com")) return "facebook"
  if (u.includes("instagram.com")) return "instagram"
  if (u.includes("tiktok.com")) return "tiktok"
  if (u.includes("snapchat.com")) return "snapchat"
  if (u.includes("linkedin.com")) return "linkedin"
  return undefined
}

export function VisitorTracker() {
  const location = useLocation()
  const tracked = useRef(new Set())

  useEffect(() => {
    const path = location.pathname + location.search
    const key = `${path}-${Math.floor(Date.now() / 60000)}`
    if (tracked.current.has(key)) return
    tracked.current.add(key)

    const sessionId = getOrCreateSessionId()
    const params = new URLSearchParams(location.search)
    const utmSource = params.get("utm_source")
    const utmMedium = params.get("utm_medium")
    const utmCampaign = params.get("utm_campaign")
    let referrer
    try {
      referrer = typeof document !== "undefined" ? document.referrer || undefined : undefined
    } catch {
      referrer = undefined
    }
    const socialChannel = detectSocialChannel(referrer ?? "")

    apiClient
      .post("/visitors/track", {
        path,
        session_id: sessionId,
        utm_source: utmSource || undefined,
        utm_medium: utmMedium || undefined,
        utm_campaign: utmCampaign || undefined,
        referrer: referrer || undefined,
        social_channel: socialChannel,
      })
      .catch(() => {})
  }, [location.pathname, location.search])

  return null
}

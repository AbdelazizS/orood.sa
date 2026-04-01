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

    apiClient
      .post("/visitors/track", {
        path,
        session_id: sessionId,
        utm_source: utmSource || undefined,
      })
      .catch(() => {})
  }, [location.pathname, location.search])

  return null
}

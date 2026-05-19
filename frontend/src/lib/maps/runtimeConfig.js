import apiClient from "@/lib/apiClient"

const state = {
  ready: false,
  engine: null,
  token: "",
  styleId: "",
  defaultCenter: null,
}

let loadPromise = null

function applyPayload(data) {
  if (!data || typeof data !== "object") return
  const engine = data.engine?.trim?.() ?? data.engine
  if (engine) state.engine = String(engine).toLowerCase()
  const token = data.mapbox_public_token?.trim?.() ?? data.mapbox_public_token
  if (token) state.token = String(token).trim()
  const style = data.style_id?.trim?.() ?? data.style_id
  if (style) state.styleId = String(style).trim()
  if (data.default_center?.lat != null && data.default_center?.lng != null) {
    state.defaultCenter = {
      lat: Number(data.default_center.lat),
      lng: Number(data.default_center.lng),
    }
  }
}

/** Load public map settings from Laravel (skipped in demo mode). */
export function ensureMapsRuntimeConfig() {
  if (loadPromise) return loadPromise
  if (import.meta.env.VITE_USE_DEMO === "true") {
    state.ready = true
    return Promise.resolve(state)
  }
  loadPromise = apiClient
    .get("/maps/config")
    .then((res) => {
      applyPayload(res?.data?.data ?? res?.data)
      return state
    })
    .catch(() => state)
    .finally(() => {
      state.ready = true
    })
  return loadPromise
}

export function isMapsRuntimeConfigReady() {
  return state.ready
}

export function getRuntimeMapEngine() {
  return state.engine
}

export function getRuntimeMapboxToken() {
  return state.token
}

export function getRuntimeMapStyleId() {
  return state.styleId
}

export function getRuntimeDefaultCenter() {
  return state.defaultCenter
}

export function subscribeMapsRuntimeConfig(listener) {
  ensureMapsRuntimeConfig().then(() => listener(state))
  return () => {}
}

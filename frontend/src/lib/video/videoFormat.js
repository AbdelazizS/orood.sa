/** 135 → "2:15", 3725 → "1:02:05". */
export function formatDuration(totalSeconds) {
  const n = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const h = Math.floor(n / 3600)
  const m = Math.floor((n % 3600) / 60)
  const s = n % 60
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`
}

/** 12_400 → "12.4 ألف" / "12.4K"; small numbers unchanged. */
export function formatCount(value, lang = "ar") {
  const n = Number(value) || 0
  const en = String(lang).startsWith("en")
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}${en ? "M" : " مليون"}`
  if (n >= 1_000) return `${Math.round(n / 100) / 10}${en ? "K" : " ألف"}`
  return String(n)
}

const TIMESTAMP_RE = /\b(\d{1,2}):([0-5]\d)(?::([0-5]\d))?\b/g

/**
 * Splits comment text into plain parts and clickable timestamps ("02:15" → 135s), like YouTube.
 * @returns {Array<{ type: "text", value: string } | { type: "time", value: string, seconds: number }>}
 */
export function splitTimestamps(text) {
  const parts = []
  let last = 0
  const src = String(text ?? "")
  for (const m of src.matchAll(TIMESTAMP_RE)) {
    if (m.index > last) parts.push({ type: "text", value: src.slice(last, m.index) })
    const seconds = m[3] != null
      ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
      : Number(m[1]) * 60 + Number(m[2])
    parts.push({ type: "time", value: m[0], seconds })
    last = m.index + m[0].length
  }
  if (last < src.length) parts.push({ type: "text", value: src.slice(last) })
  return parts
}

/**
 * Reads duration, orientation and a thumbnail frame from a local video file in the browser
 * (no server-side ffmpeg needed).
 * @param {File} file
 * @returns {Promise<{ duration: number, width: number, height: number, thumbnail: Blob | null }>}
 */
export function probeVideoFile(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"
    video.muted = true
    video.playsInline = true
    video.src = url
    let done = false
    const finish = (result) => {
      if (done) return
      done = true
      URL.revokeObjectURL(url)
      resolve(result)
    }
    const fallback = setTimeout(() => finish({ duration: 0, width: 0, height: 0, thumbnail: null }), 15000)

    video.addEventListener("loadedmetadata", () => {
      // Grab a frame a little into the clip (avoid black first frames).
      const target = Math.min(Math.max(video.duration * 0.15, 0.5), Math.max(video.duration - 0.1, 0))
      video.currentTime = Number.isFinite(target) ? target : 0
    })
    video.addEventListener("seeked", () => {
      const width = video.videoWidth
      const height = video.videoHeight
      const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : 0
      try {
        const canvas = document.createElement("canvas")
        const scale = Math.min(1, 1280 / Math.max(width, height || 1))
        canvas.width = Math.max(1, Math.round(width * scale))
        canvas.height = Math.max(1, Math.round(height * scale))
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            clearTimeout(fallback)
            finish({ duration, width, height, thumbnail: blob })
          },
          "image/jpeg",
          0.82,
        )
      } catch {
        clearTimeout(fallback)
        finish({ duration, width, height, thumbnail: null })
      }
    })
    video.addEventListener("error", () => {
      clearTimeout(fallback)
      finish({ duration: 0, width: 0, height: 0, thumbnail: null })
    })
  })
}

export const COMPANY_ACTIVITIES = ["marketer", "developer", "seller"]

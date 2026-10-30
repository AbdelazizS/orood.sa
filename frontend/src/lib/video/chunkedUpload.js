import apiClient from "@/lib/apiClient"

/** 512 KB pieces: under nginx's 1 MB and PHP's 2 MB default limits, so big videos never hit "POST data is too large". */
export const VIDEO_CHUNK_BYTES = 512 * 1024

function uuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  // RFC 4122 v4 fallback (older browsers / non-secure contexts).
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/**
 * Sends a file to /uploads/video-chunks piece by piece (with a retry per piece).
 * @param {File|Blob} file
 * @param {(percent: number) => void} [onProgress]
 * @returns {Promise<string>} upload_id to pass to the save endpoint
 */
export async function uploadVideoInChunks(file, onProgress) {
  const uploadId = uuid()
  const total = Math.max(1, Math.ceil(file.size / VIDEO_CHUNK_BYTES))
  for (let index = 0; index < total; index++) {
    const part = file.slice(index * VIDEO_CHUNK_BYTES, Math.min(file.size, (index + 1) * VIDEO_CHUNK_BYTES))
    const fd = new FormData()
    fd.append("upload_id", uploadId)
    fd.append("index", String(index))
    fd.append("total", String(total))
    fd.append("chunk", part, "part")
    let attempt = 0
    for (;;) {
      try {
        await apiClient.post("/uploads/video-chunks", fd, { headers: { "Content-Type": "multipart/form-data" }, timeout: 120_000 })
        break
      } catch (err) {
        attempt++
        if (attempt >= 3) throw err
        await new Promise((r) => setTimeout(r, 1000 * attempt))
      }
    }
    onProgress?.(Math.round(((index + 1) / total) * 100))
  }
  return uploadId
}

/**
 * In-browser video compression (no extra library): plays the video into a canvas scaled to
 * at most 720p and records it with MediaRecorder at ~2.5 Mbps, keeping the sound.
 * Runs in real time (a 60 s clip takes ~60 s). Returns null when the browser can't do it
 * or the result isn't smaller — the caller then uploads the original.
 */

const MAX_SIDE = 1280
const VIDEO_BITS = 2_500_000
const AUDIO_BITS = 128_000

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return null
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ]
  return candidates.find((m) => MediaRecorder.isTypeSupported?.(m)) ?? null
}

export function canCompressVideo() {
  return (
    typeof document !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    Boolean(pickMimeType())
  )
}

/**
 * @param {File} file
 * @param {{ onProgress?: (percent: number) => void, signal?: AbortSignal }} [opts]
 * @returns {Promise<File|null>}
 */
export function compressVideo(file, { onProgress, signal } = {}) {
  const mimeType = pickMimeType()
  if (!canCompressVideo() || !mimeType) return Promise.resolve(null)

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.src = url
    video.playsInline = true
    video.muted = false
    video.preload = "auto"

    let audioCtx = null
    let recorder = null
    let raf = 0
    let finished = false
    const chunks = []

    const cleanup = () => {
      cancelAnimationFrame(raf)
      try {
        video.pause()
      } catch {
        /* ignore */
      }
      audioCtx?.close?.().catch(() => {})
      URL.revokeObjectURL(url)
    }
    const fail = () => {
      if (finished) return
      finished = true
      try {
        if (recorder && recorder.state !== "inactive") recorder.stop()
      } catch {
        /* ignore */
      }
      cleanup()
      resolve(null)
    }
    signal?.addEventListener("abort", fail)

    video.addEventListener("error", fail)
    video.addEventListener("loadedmetadata", async () => {
      try {
        const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth || 1, video.videoHeight || 1))
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(2, Math.round((video.videoWidth * scale) / 2) * 2)
        canvas.height = Math.max(2, Math.round((video.videoHeight * scale) / 2) * 2)
        const ctx = canvas.getContext("2d")
        const stream = canvas.captureStream(30)

        // Sound: route the video's audio into the recording (and not to the speakers).
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext
          if (AudioCtx) {
            audioCtx = new AudioCtx()
            const source = audioCtx.createMediaElementSource(video)
            const dest = audioCtx.createMediaStreamDestination()
            source.connect(dest)
            dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track))
          }
        } catch {
          /* silent video is still better than a failed upload */
        }

        recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: VIDEO_BITS, audioBitsPerSecond: AUDIO_BITS })
        recorder.ondataavailable = (e) => e.data?.size && chunks.push(e.data)
        recorder.onstop = () => {
          if (finished) return
          finished = true
          cleanup()
          const type = mimeType.split(";")[0]
          const blob = new Blob(chunks, { type })
          if (!blob.size || blob.size >= file.size) {
            resolve(null)
            return
          }
          const ext = type === "video/webm" ? "webm" : "mp4"
          const name = file.name.replace(/\.[^.]+$/, "") + "-compressed." + ext
          resolve(new File([blob], name, { type }))
        }

        const draw = () => {
          if (video.ended || finished) return
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          if (video.duration) onProgress?.(Math.min(99, Math.round((video.currentTime / video.duration) * 100)))
          raf = requestAnimationFrame(draw)
        }
        video.addEventListener("ended", () => {
          onProgress?.(100)
          if (recorder.state !== "inactive") recorder.stop()
        })

        recorder.start(1000)
        await video.play()
        draw()
      } catch {
        fail()
      }
    })
  })
}

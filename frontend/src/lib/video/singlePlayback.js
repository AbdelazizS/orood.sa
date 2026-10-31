/**
 * Only one video plays at a time across the site: when any <video> starts, the others pause.
 * Installed once at startup (capture phase, because "play" doesn't bubble).
 */
export function installSingleVideoPlayback() {
  if (typeof document === "undefined" || window.__aroothSingleVideo) return
  window.__aroothSingleVideo = true
  document.addEventListener(
    "play",
    (e) => {
      if (!(e.target instanceof HTMLVideoElement)) return
      document.querySelectorAll("video").forEach((v) => {
        if (v !== e.target && !v.paused) v.pause()
      })
    },
    true,
  )
}

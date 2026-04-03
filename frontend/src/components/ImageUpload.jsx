import { useState, useRef, useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"
import apiClient from "@/lib/apiClient"
import { Upload, X, Loader2 } from "lucide-react"

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_IMAGES = 5

export function ImageUpload({ value = [], onChange, disabled, minImages = 1 }) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [pendingPreviews, setPendingPreviews] = useState([]) // { id, blobUrl, file }
  const inputRef = useRef(null)
  const blobUrlsRef = useRef([])

  const urls = Array.isArray(value) ? value : []

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      blobUrlsRef.current = []
    }
  }, [])

  const handleFileSelect = useCallback(
    async (files) => {
      const fileList = Array.from(files || [])
      if (fileList.length === 0) return
      if (urls.length + pendingPreviews.length + fileList.length > MAX_IMAGES) {
        setError(t("imageUpload.maxImages", { max: MAX_IMAGES }))
        return
      }
      setError(null)

      // Create immediate blob previews
      const newPreviews = fileList.map((file) => {
        const blobUrl = URL.createObjectURL(file)
        blobUrlsRef.current.push(blobUrl)
        return { id: Math.random().toString(36).slice(2), blobUrl, file }
      })
      setPendingPreviews((prev) => [...prev, ...newPreviews])
      setUploading(true)

      try {
        const newUrls = []
        for (const { file, id } of newPreviews) {
          if (file.size > MAX_SIZE) {
            setError(t("imageUpload.maxSize", { max: "5MB" }))
            const p = newPreviews.find((x) => x.id === id)
            if (p?.blobUrl) {
              URL.revokeObjectURL(p.blobUrl)
              blobUrlsRef.current = blobUrlsRef.current.filter((u) => u !== p.blobUrl)
            }
            setPendingPreviews((prev) => prev.filter((p) => p.id !== id))
            continue
          }
          const formData = new FormData()
          formData.append("image", file)
          const res = await apiClient.post("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          })
          const rawUrl = res?.data?.url ?? res?.data?.data?.url ?? res?.url
          if (rawUrl) newUrls.push(rawUrl)
          const p = newPreviews.find((x) => x.id === id)
          if (p?.blobUrl) {
            URL.revokeObjectURL(p.blobUrl)
            blobUrlsRef.current = blobUrlsRef.current.filter((u) => u !== p.blobUrl)
          }
          setPendingPreviews((prev) => prev.filter((p) => p.id !== id))
        }
        if (newUrls.length) onChange([...urls, ...newUrls])
      } catch (err) {
        setError(err?.response?.data?.message ?? t("imageUpload.uploadFailed"))
        setPendingPreviews((prev) => prev.filter((p) => !newPreviews.some((n) => n.id === p.id)))
        newPreviews.forEach((p) => {
          URL.revokeObjectURL(p.blobUrl)
          blobUrlsRef.current = blobUrlsRef.current.filter((u) => u !== p.blobUrl)
        })
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ""
      }
    },
    [urls, onChange, t]
  )

  const onInputChange = (e) => {
    handleFileSelect(e.target.files)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled || uploading) return
    handleFileSelect(e.dataTransfer?.files)
  }

  const onDragOver = (e) => {
    e.preventDefault()
    if (disabled || uploading) return
    setDragOver(true)
  }

  const onDragLeave = () => setDragOver(false)

  const remove = (index) => {
    const next = urls.filter((_, i) => i !== index)
    onChange(next)
  }

  const displayItems = [
    ...urls.map((url, i) => ({ type: "url", url, index: i })),
    ...pendingPreviews.map((p) => ({ type: "blob", blobUrl: p.blobUrl, id: p.id })),
  ]

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex flex-wrap gap-3 rounded-xl border-2 border-dashed p-4 transition-colors",
          dragOver && "border-primary bg-primary/5",
          !dragOver && "border-muted-foreground/25"
        )}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        {displayItems.map((item) => (
          <div key={item.type === "url" ? `url-${item.index}` : `blob-${item.id}`} className="relative group">
            <div className="h-24 w-24 rounded-lg overflow-hidden border-2 border-muted bg-muted">
              <img
                src={item.type === "url" ? resolveImageUrl(item.url) : item.blobUrl}
                referrerPolicy="no-referrer"
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' fill='%23999'%3E%3Crect width='96' height='96' fill='%23eee'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='10'%3E?%3C/text%3E%3C/svg%3E"
                }}
              />
            </div>
            {!disabled && item.type === "url" && (
              <button
                type="button"
                onClick={() => remove(item.index)}
                className="absolute -top-1 -end-1 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md opacity-0 group-hover:opacity-100 transition"
                aria-label={t("common.cancel")}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        {!disabled && displayItems.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/50 transition",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="size-8 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">
                  {t("imageUpload.add", "Add")}
                </span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={onInputChange}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        {t("imageUpload.hint", "Max 5MB per image, up to 5 images. Main image = first.")}
      </p>
    </div>
  )
}

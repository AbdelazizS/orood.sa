import { useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import apiClient from "@/lib/apiClient"
import { Upload, Loader2 } from "lucide-react"

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export function ProfileImageUpload({ value, onChange, variant = "avatar", disabled }) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_SIZE) {
      setError(t("imageUpload.maxSize", { max: "5MB" }))
      return
    }
    setError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("image", file)
      const { data } = await apiClient.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      const url = data?.url ?? data?.data?.url
      if (url) onChange(url)
    } catch (err) {
      setError(err?.response?.data?.message ?? t("imageUpload.uploadFailed"))
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const isCover = variant === "cover"

  return (
    <div className="space-y-2">
      <div
        className={`
          relative overflow-hidden rounded-xl border-2 border-dashed border-muted
          ${isCover ? "aspect-[3/1] min-h-[120px]" : "flex h-24 w-24 items-center justify-center"}
        `}
      >
        {isCover ? (
          value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted/50" />
          )
        ) : (
          <Avatar className="size-24">
            {value ? (
              <img src={value} alt="" className="size-full object-cover" />
            ) : (
              <AvatarFallback className="text-2xl">?</AvatarFallback>
            )}
          </Avatar>
        )}
        {!disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-8 animate-spin text-white" />
            ) : (
              <Upload className="size-8 text-white" />
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

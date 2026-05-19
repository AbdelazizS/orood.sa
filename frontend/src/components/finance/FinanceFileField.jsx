import { useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Upload, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import apiClient from "@/lib/apiClient"
import { cn } from "@/lib/utils"

/**
 * Uploads a file to /upload and stores the returned URL in the parent form state.
 */
export function FinanceFileField({
  id,
  label,
  required = false,
  value = "",
  onChange,
  accept = "image/*,.pdf",
  error,
  className,
  /** wallet_charge | wallet_withdraw | order_payment — picks upload error copy on the API */
  uploadContext,
  formatHint,
}) {
  const { t } = useTranslation()
  const inputRef = useRef(null)

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const form = new FormData()
      form.append("file", file)
      if (uploadContext) {
        form.append("context", uploadContext)
      }
      const { data } = await apiClient.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data
    },
    onSuccess: (res) => {
      const body = res?.data && typeof res.data === "object" && !Array.isArray(res.data) ? res.data : res
      let url = body?.url ?? body?.path ?? ""
      if (url && !url.startsWith("http") && !url.startsWith("/")) {
        url = `/storage/${url}`
      }
      if (url) {
        onChange?.(url)
        toast.success(t("finance.fileUploaded", "تم رفع الملف"))
      } else {
        toast.error(t("finance.uploadNoUrl", "لم يُرجع الخادم رابط الملف. حاول مرة أخرى."))
      }
    },
    onError: (err) => {
      const data = err?.response?.data
      const fieldErrors = data?.errors
      let msg = data?.message
      if (!msg && fieldErrors && typeof fieldErrors === "object") {
        const parts = Object.values(fieldErrors).flat().filter(Boolean)
        if (parts.length) msg = parts.join(" ")
      }
      toast.error(msg || t("common.error"))
    },
  })

  const fileName = value ? value.split("/").pop() : ""

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="min-h-10 max-w-full"
          disabled={uploadMutation.isPending}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) uploadMutation.mutate(file)
            e.target.value = ""
          }}
        />
        {uploadMutation.isPending ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="size-4 text-muted-foreground" aria-hidden />
        )}
      </div>
      {value ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground truncate max-w-[240px]" title={fileName}>
            {fileName || t("finance.fileAttached", "ملف مرفق")}
          </span>
          <Button type="button" variant="link" size="sm" className="h-auto p-0" asChild>
            <a href={value} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5 me-1 inline" />
              {t("common.view", "عرض")}
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange?.("")}
          >
            {t("common.remove", "إزالة")}
          </Button>
        </div>
      ) : null}
      {formatHint ? <p className="text-xs text-muted-foreground">{formatHint}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

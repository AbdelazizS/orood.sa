import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { ExternalLink, FileText, ImageIcon } from "lucide-react"
import { resolveAssetUrl, looksLikeAssetUrl, isPdfAssetUrl } from "@/lib/imageUrl"
import { cn } from "@/lib/utils"

/**
 * Extract receipt URL from charge/financial request row shape.
 */
export function extractReceiptHref(row) {
  if (!row) return ""

  for (const v of row.values ?? []) {
    const raw = v.file_url || v.value_text || ""
    if (!raw || !looksLikeAssetUrl(raw)) continue
    if (
      v.field_key === "receipt_url" ||
      v.field_key === "file_url" ||
      v.field_type === "file" ||
      String(v.field_key).includes("receipt")
    ) {
      return resolveAssetUrl(raw)
    }
  }

  if (row.receipt_url && looksLikeAssetUrl(row.receipt_url)) {
    return resolveAssetUrl(row.receipt_url)
  }

  return ""
}

export function isReceiptValueField(row) {
  if (!row) return false
  const raw = row.file_url || row.value_text || ""
  if (!looksLikeAssetUrl(raw)) return false
  return (
    row.field_key === "receipt_url" ||
    row.field_key === "file_url" ||
    row.field_type === "file" ||
    String(row.field_key).includes("receipt")
  )
}

/**
 * Enterprise-style receipt row: label + action only — never exposes /storage/... paths.
 */
export function TransferReceiptDocument({ href, className, showPreview = false }) {
  const { t } = useTranslation()
  if (!href) return null

  const pdf = isPdfAssetUrl(href)
  const Icon = pdf ? FileText : ImageIcon
  const typeLabel = pdf
    ? t("admin.receiptTypePdf", "ملف PDF")
    : t("admin.receiptTypeImage", "صورة")

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium leading-tight">
              {t("orders.directTransferReceiptTitle", "سند التحويل")}
            </p>
            <p className="text-xs text-muted-foreground">{typeLabel}</p>
          </div>
        </div>
        <Button type="button" variant="default" size="sm" className="shrink-0 w-full sm:w-auto" asChild>
          <a href={href} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="me-1.5 size-4" />
            {t("admin.viewReceipt", "عرض الإيصال")}
          </a>
        </Button>
      </div>
      {showPreview ? (
        pdf ? (
          <iframe
            title={t("orders.directTransferReceiptTitle", "سند التحويل")}
            src={href}
            className="h-72 w-full rounded-lg border bg-white"
          />
        ) : (
          <a href={href} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={href}
              alt=""
              className="mx-auto max-h-72 w-full rounded-lg border object-contain bg-white"
            />
          </a>
        )
      ) : null}
    </div>
  )
}

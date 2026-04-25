import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { toast } from "sonner"

const REASON_PRESETS = [
  "spam",
  "fraud",
  "wrong_description",
  "prohibited_item",
  "other",
]

export function ListingReportDialog({ open, onOpenChange, listingId }) {
  const { t } = useTranslation()
  const { token, user } = useAuthStore()
  const [detail, setDetail] = useState("")
  const [reasonPreset, setReasonPreset] = useState("none")
  const [customReason, setCustomReason] = useState("")
  const [email, setEmail] = useState(user?.email ?? "")

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(`/listings/${listingId}/report`, payload)
      return data
    },
    onSuccess: (data) => {
      setDetail("")
      setReasonPreset("none")
      setCustomReason("")
      toast.success(data?.message ?? t("listingDetail.reportSent", "Report sent"))
      onOpenChange(false)
    },
    onError: (err) => {
      const raw = err?.response?.data?.message
      const dupEn = "You already have an active report for this listing."
      if (typeof raw === "string" && (raw === dupEn || raw.includes("active report"))) {
        toast.error(t("listingDetail.reportDuplicateActive"))
        return
      }
      toast.error(t("common.errorGeneric"))
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!listingId) return
    if (!detail.trim()) {
      toast.error(t("listingDetail.reportMessageRequired", "Please provide details"))
      return
    }
    const reasonValue = (customReason.trim() || (reasonPreset !== "none" ? reasonPreset : "")).trim()
    const payload = { message: detail.trim(), reason: reasonValue || undefined }
    if (!token) {
      payload.email = email.trim()
    }
    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("listingDetail.reportToAdmin")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {!token && (
              <div className="grid gap-2">
                <Label htmlFor="report-email">{t("auth.email")}</Label>
                <Input
                  id="report-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="report-reason">{t("listingDetail.reportReason")}</Label>
              <Select value={reasonPreset} onValueChange={setReasonPreset}>
                <SelectTrigger id="report-reason">
                  <SelectValue placeholder={t("listingDetail.reportReasonPlaceholder", "Select reason")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.none", "None")}</SelectItem>
                  {REASON_PRESETS.map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {t(`listingDetail.reportReasons.${preset}`, preset.replace("_", " "))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="report-reason-custom">{t("listingDetail.reportReasonCustom", "Additional reason (optional)")}</Label>
              <Input
                id="report-reason-custom"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                maxLength={255}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="report-msg">{t("listingDetail.reportMessage")}</Label>
              <Textarea
                id="report-msg"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                required
                rows={4}
                maxLength={2000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("common.loading") : t("listingDetail.sendReport")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
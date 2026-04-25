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

const REASON_PRESETS = ["harassment", "fake_profile", "fraud_scam", "spam", "impersonation", "other"]

export function ProfileReportDialog({ open, onOpenChange, reportedUserId }) {
  const { t } = useTranslation()
  const { token, user } = useAuthStore()
  const [detail, setDetail] = useState("")
  const [reasonPreset, setReasonPreset] = useState("none")
  const [customReason, setCustomReason] = useState("")
  const [email, setEmail] = useState(user?.email ?? "")

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(`/users/${reportedUserId}/report`, payload)
      return data
    },
    onSuccess: () => {
      setDetail("")
      setReasonPreset("none")
      setCustomReason("")
      toast.success(t("publicProfile.reportSent"))
      onOpenChange(false)
    },
    onError: (err) => {
      const raw = err?.response?.data?.message
      if (
        typeof raw === "string" &&
        (raw.includes("active report") || raw.includes("already have") || raw.includes("بلاغ نشط"))
      ) {
        toast.error(t("publicProfile.reportDuplicateActive"))
        return
      }
      if (typeof raw === "string" && (raw.includes("own account") || raw.includes("نفسك"))) {
        toast.error(t("publicProfile.reportCannotSelf"))
        return
      }
      toast.error(t("common.errorGeneric"))
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!reportedUserId) return
    if (!detail.trim()) {
      toast.error(t("publicProfile.reportMessageRequired"))
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
            <DialogTitle>{t("publicProfile.reportToAdmin")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {!token && (
              <div className="grid gap-2">
                <Label htmlFor="profile-report-email">{t("auth.email")}</Label>
                <Input
                  id="profile-report-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="profile-report-reason">{t("publicProfile.reportReason")}</Label>
              <Select value={reasonPreset} onValueChange={setReasonPreset}>
                <SelectTrigger id="profile-report-reason">
                  <SelectValue placeholder={t("publicProfile.reportReasonPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.none", "None")}</SelectItem>
                  {REASON_PRESETS.map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {t(`publicProfile.reportReasons.${preset}`, preset.replace(/_/g, " "))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-report-reason-custom">{t("publicProfile.reportReasonCustom")}</Label>
              <Input
                id="profile-report-reason-custom"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                maxLength={255}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-report-msg">{t("publicProfile.reportMessage")}</Label>
              <Textarea
                id="profile-report-msg"
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
              {mutation.isPending ? t("common.loading") : t("publicProfile.sendReport")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

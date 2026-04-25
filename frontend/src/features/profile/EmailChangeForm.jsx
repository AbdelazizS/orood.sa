import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import apiClient from "@/lib/apiClient"
import { fetchUser } from "@/services/authService"
import { useAuthStore } from "@/store/useAuthStore"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function EmailChangeForm({ username }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [step, setStep] = useState("request")
  const [newEmail, setNewEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [code, setCode] = useState("")

  const requestMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/auth/change-email-request", {
        email: newEmail.trim(),
        current_password: currentPassword,
      })
      return data
    },
    onSuccess: (data) => {
      toast.success(data?.message ?? t("profile.emailOtpSent", "Check your new inbox for the code."))
      setStep("confirm")
      setCurrentPassword("")
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message ??
        Object.values(err?.response?.data?.errors ?? {}).flat()[0] ??
        t("common.error")
      toast.error(msg)
    },
  })

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/auth/change-email-confirm", { code: code.trim() })
      return data
    },
    onSuccess: async (data) => {
      toast.success(data?.message ?? t("profile.emailUpdated", "Email updated."))
      if (data?.user) {
        useAuthStore.getState().setAuth(data.user, useAuthStore.getState().token)
      } else {
        await fetchUser()
      }
      await queryClient.invalidateQueries({ queryKey: ["profile", username] })
      await queryClient.invalidateQueries({ queryKey: ["auth", "user"] })
      setStep("request")
      setNewEmail("")
      setCode("")
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message ??
        Object.values(err?.response?.data?.errors ?? {}).flat()[0] ??
        t("common.error")
      toast.error(msg)
    },
  })

  if (step === "confirm") {
    return (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (code.trim().length !== 6) return
          confirmMutation.mutate()
        }}
      >
        <p className="text-sm text-muted-foreground">
          {t("profile.emailConfirmHint", "Enter the 6-digit code we sent to {{email}}.", {
            email: newEmail.trim() || "…",
          })}
        </p>
        <div>
          <Label>{t("auth.verificationCode", "Verification code")}</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="mt-1 font-mono text-lg tracking-widest"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={confirmMutation.isPending || code.trim().length !== 6}>
            {confirmMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("profile.confirmEmailChange", "Confirm new email")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setStep("request")
              setCode("")
            }}
          >
            {t("common.back", "Back")}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        requestMutation.mutate()
      }}
    >
      <div>
        <Label>{t("auth.email", "Email")}</Label>
        <Input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="mt-1"
          autoComplete="email"
          required
        />
      </div>
      <div>
        <Label>{t("profile.currentPasswordForEmail", "Current password")}</Label>
        <PasswordInput
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="mt-1"
          autoComplete="current-password"
          required
        />
      </div>
      <Button type="submit" disabled={requestMutation.isPending}>
        {requestMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("profile.sendEmailCode", "Send verification code")}
      </Button>
    </form>
  )
}

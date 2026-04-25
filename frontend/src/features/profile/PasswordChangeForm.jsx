import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import * as authService from "@/services/authService"
import { Loader2 } from "lucide-react"

export function PasswordChangeForm() {
  const { t } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const { data: passwordPolicy } = useQuery({
    queryKey: ["auth", "password-policy"],
    queryFn: authService.getPasswordPolicy,
    staleTime: 0,
    refetchOnMount: "always",
  })

  const mutation = useMutation({
    mutationFn: () =>
      authService.changePassword(currentPassword, password, passwordConfirmation),
    onSuccess: () => {
      setSuccess(true)
      setCurrentPassword("")
      setPassword("")
      setPasswordConfirmation("")
    },
    onError: (err) => {
      setError(err?.response?.data?.message ?? err?.response?.data?.errors?.current_password?.[0] ?? t("auth.loginError"))
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (password !== passwordConfirmation) {
      setError(t("auth.passwordMismatch"))
      return
    }
    const minLength = Number(passwordPolicy?.min_length ?? 6)
    const requires = Array.isArray(passwordPolicy?.requires) ? passwordPolicy.requires : ["letter", "number"]
    const checks = [
      password.length >= minLength,
      !requires.includes("letter") || /[A-Za-z]/.test(password),
      !requires.includes("number") || /\d/.test(password),
      !requires.includes("uppercase") || /[A-Z]/.test(password),
      !requires.includes("lowercase") || /[a-z]/.test(password),
      !requires.includes("special") || /[^\w\s]/.test(password),
    ]
    if (!checks.every(Boolean)) {
      setError(t("auth.passwordWeak"))
      return
    }
    mutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>{t("profile.currentPassword", "كلمة المرور الحالية")}</Label>
        <PasswordInput
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          disabled={mutation.isPending}
          className="mt-1"
        />
      </div>
      <div>
        <Label>{t("auth.password", "كلمة المرور الجديدة")}</Label>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={Number(passwordPolicy?.min_length ?? 6)}
          disabled={mutation.isPending}
          className="mt-1"
        />
      </div>
      <div>
        <Label>{t("auth.passwordConfirm", "تأكيد كلمة المرور")}</Label>
        <PasswordInput
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          required
          disabled={mutation.isPending}
          className="mt-1"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-500">
          {t("profile.passwordChanged", "تم تغيير كلمة المرور بنجاح")}
        </p>
      )}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("profile.changePassword", "تغيير كلمة المرور")}
      </Button>
    </form>
  )
}

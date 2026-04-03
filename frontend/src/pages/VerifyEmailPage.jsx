import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation } from "@tanstack/react-query"
import { useAuthStore } from "@/store/useAuthStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as authService from "@/services/authService"
import { Loader2, Mail, ArrowRight, ArrowLeft } from "lucide-react"

/**
 * VerifyEmailPage — for users who need to verify email (e.g. skipped during registration).
 * If logged in: uses their email. If not: they enter email first.
 */
export function VerifyEmailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const [email, setEmail] = useState(user?.email ?? "")
  const [otpCode, setOtpCode] = useState("")
  const [step, setStep] = useState(token && user?.email ? 2 : 1)
  const [fieldErrors, setFieldErrors] = useState({})
  const [resendCooldown, setResendCooldown] = useState(0)

  const sendOtpMutation = useMutation({
    mutationFn: () => authService.verifyEmail(email),
    onSuccess: (data) => {
      setStep(2)
      setResendCooldown(data?.resend_available_in ?? 60)
    },
    onError: (err) => {
      const data = err?.response?.data
      if (data?.errors) {
        const flat = {}
        for (const [k, v] of Object.entries(data.errors)) {
          flat[k] = Array.isArray(v) ? v[0] : v
        }
        setFieldErrors(flat)
      }
    },
  })

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((c) => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const confirmMutation = useMutation({
    mutationFn: () => authService.confirmEmail(email, otpCode),
    onSuccess: () => navigate("/", { replace: true }),
    onError: (err) => {
      const data = err?.response?.data
      if (data?.errors) {
        const flat = {}
        for (const [k, v] of Object.entries(data.errors)) {
          flat[k] = Array.isArray(v) ? v[0] : v
        }
        setFieldErrors(flat)
      }
    },
  })

  const handleSendOtp = (e) => {
    e.preventDefault()
    setFieldErrors({})
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldErrors({ email: t("auth.emailInvalid") })
      return
    }
    sendOtpMutation.mutate()
  }

  const handleConfirm = (e) => {
    e.preventDefault()
    setFieldErrors({})
    if (!otpCode || otpCode.length !== 6) {
      setFieldErrors({ code: t("auth.otpInvalid") })
      return
    }
    confirmMutation.mutate()
  }

  if (step === 1) {
    return (
      <div className="flex w-full justify-center">
        <Card className="w-full max-w-md border-0 shadow-xl sm:border">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
              <Mail className="size-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t("auth.verifyEmail")}</CardTitle>
            <CardDescription>{t("auth.verifyEmailEnterEmail")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={sendOtpMutation.isPending}
                />
                {fieldErrors.email && (
                  <p className="text-sm text-destructive">{fieldErrors.email}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={sendOtpMutation.isPending}
              >
                {sendOtpMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4 rtl-rotate" />
                )}
                {t("auth.sendCode")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex w-full justify-center">
      <Card className="w-full max-w-md border-0 shadow-xl sm:border">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Mail className="size-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t("auth.verifyEmail")}</CardTitle>
          <CardDescription>
            {t("auth.verifyEmailDescription", { email: email || "your email" })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConfirm} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">{t("auth.verificationCode")}</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                disabled={confirmMutation.isPending}
              />
              {fieldErrors.code && (
                <p className="text-sm text-destructive">{fieldErrors.code}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={confirmMutation.isPending || otpCode.length !== 6}
            >
              {confirmMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4 rtl-rotate" />
              )}
              {t("auth.confirmEmail")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={sendOtpMutation.isPending || resendCooldown > 0}
              onClick={() => sendOtpMutation.mutate()}
            >
              {sendOtpMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : resendCooldown > 0 ? (
                t("auth.resendIn", { seconds: resendCooldown })
              ) : (
                t("auth.resendCode")
              )}
            </Button>
          </form>
          <Button variant="link" asChild className="mt-4 w-full">
            <Link to="/" className="flex items-center justify-center gap-2">
              <ArrowLeft className="size-4 rtl-rotate" />
              {t("common.back")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

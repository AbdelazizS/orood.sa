import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter"
import * as authService from "@/services/authService"
import { Loader2, Mail, ArrowRight } from "lucide-react"

const PASSWORD_RULES = {
  min: (p) => p.length >= 8,
  upper: (p) => /[A-Z]/.test(p),
  lower: (p) => /[a-z]/.test(p),
  number: (p) => /\d/.test(p),
  special: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
}

function validatePassword(p) {
  return Object.values(PASSWORD_RULES).every((fn) => fn(p))
}

export function RegisterForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})

  const registerMutation = useMutation({
    mutationFn: () =>
      authService.register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      }),
    onSuccess: (data) => {
      if (data?.email_verified) {
        navigate("/", { replace: true })
      } else {
        setStep(2)
        setResendCooldown(60) // Cooldown after initial send
      }
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

  const verifyMutation = useMutation({
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

  const [resendCooldown, setResendCooldown] = useState(0)

  const resendMutation = useMutation({
    mutationFn: () => authService.verifyEmail(email),
    onSuccess: (data) => {
      setResendCooldown(data?.resend_available_in ?? 60)
    },
  })

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((c) => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const handleRegister = (e) => {
    e.preventDefault()
    setFieldErrors({})
    const errs = {}
    if (!name.trim()) errs.name = t("auth.nameRequired")
    if (!email.trim()) errs.email = t("auth.emailRequired")
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t("auth.emailInvalid")
    if (!password) errs.password = t("auth.passwordRequired")
    else if (!validatePassword(password)) errs.password = t("auth.passwordWeak")
    if (password !== passwordConfirmation) errs.password_confirmation = t("auth.passwordMismatch")
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    registerMutation.mutate()
  }

  const handleVerify = (e) => {
    e.preventDefault()
    setFieldErrors({})
    if (!otpCode || otpCode.length !== 6) {
      setFieldErrors({ code: t("auth.otpInvalid") })
      return
    }
    verifyMutation.mutate()
  }

  if (step === 2) {
    return (
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
          <form onSubmit={handleVerify} className="space-y-4">
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
                disabled={verifyMutation.isPending}
                autoFocus
              />
              {fieldErrors.code && (
                <p className="text-sm text-destructive">{fieldErrors.code}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={verifyMutation.isPending || otpCode.length !== 6}
            >
              {verifyMutation.isPending ? (
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
              disabled={resendMutation.isPending || resendCooldown > 0}
              onClick={() => resendMutation.mutate()}
            >
              {resendMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : resendCooldown > 0 ? (
                t("auth.resendIn", { seconds: resendCooldown })
              ) : (
                t("auth.resendCode")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-xl sm:border">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">{t("auth.register")}</CardTitle>
        <CardDescription>{t("auth.registerDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("auth.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("auth.namePlaceholder")}
              required
              disabled={registerMutation.isPending}
              className={fieldErrors.name ? "border-destructive" : ""}
            />
            {fieldErrors.name && (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              disabled={registerMutation.isPending}
              className={fieldErrors.email ? "border-destructive" : ""}
            />
            {fieldErrors.email && (
              <p className="text-sm text-destructive">{fieldErrors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={registerMutation.isPending}
              className={fieldErrors.password ? "border-destructive" : ""}
            />
            <PasswordStrengthMeter password={password} />
            {fieldErrors.password && (
              <p className="text-sm text-destructive">{fieldErrors.password}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="passwordConfirmation">{t("auth.passwordConfirm")}</Label>
            <PasswordInput
              id="passwordConfirmation"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              minLength={8}
              disabled={registerMutation.isPending}
              className={fieldErrors.password_confirmation ? "border-destructive" : ""}
            />
            {fieldErrors.password_confirmation && (
              <p className="text-sm text-destructive">{fieldErrors.password_confirmation}</p>
            )}
          </div>
          {registerMutation.isError && !registerMutation.error?.response?.data?.errors && (
            <p className="text-sm text-destructive">
              {registerMutation.error?.response?.data?.message ?? t("auth.registerError")}
            </p>
          )}
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4 rtl-rotate" />
            )}
            {t("auth.register")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t("auth.hasAccount")}{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              {t("auth.login")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

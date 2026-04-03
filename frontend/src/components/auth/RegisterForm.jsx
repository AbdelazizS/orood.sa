import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter"
import { TermsBox } from "@/components/auth/TermsBox"
import { CompanyFields } from "@/components/auth/CompanyFields"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import * as authService from "@/services/authService"
import { Loader2, ArrowRight } from "lucide-react"

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

const FORM_MAX_WIDTH = "max-w-lg"
const FIELD_SPACING = "space-y-2"
const SECTION_SPACING = "space-y-5"

export function RegisterForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    howDidYouHear: "",
    termsAccepted: false,
    registerAsCompany: false,
    companyName: "",
    regionId: null,
    companyCityId: "",
    companyProductTypes: "",
    companyLicense: null,
  })
  const [fieldErrors, setFieldErrors] = useState({})

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const registerMutation = useMutation({
    mutationFn: () =>
      authService.register({
        name: formData.username,
        email: formData.email,
        how_did_you_hear: formData.howDidYouHear || undefined,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
      }),
    onSuccess: (data) => {
      navigate("/", { replace: true })
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

  const handleRegister = (e) => {
    e.preventDefault()
    setFieldErrors({})
    const errs = {}
    if (!formData.username.trim()) errs.username = t("auth.usernameRequired")
    else if (formData.username.trim().length < 3) errs.username = t("auth.usernameMin")
    if (!formData.email.trim()) errs.email = t("auth.emailRequired")
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = t("auth.emailInvalid")
    if (!formData.password) errs.password = t("auth.passwordRequired")
    else if (!validatePassword(formData.password)) errs.password = t("auth.passwordWeak")
    if (formData.password !== formData.confirmPassword) {
      errs.password_confirmation = t("auth.passwordMismatch")
    }
    if (!formData.termsAccepted) errs.termsAccepted = t("auth.termsRequired")
    if (formData.registerAsCompany) {
      if (!formData.companyName?.trim()) errs.companyName = t("auth.companyNameRequired")
      if (!formData.companyCityId) errs.companyCityId = t("auth.companyCityRequired")
    }
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    registerMutation.mutate()
  }

  return (
    <div
      className={`w-full ${FORM_MAX_WIDTH} rounded-xl border border-border bg-card p-8 shadow-sm`}
    >
      <h1 className="mb-8 text- text-xl font-semibold text-foreground">
        {t("auth.registerSubmit")}
      </h1>
      <form onSubmit={handleRegister} className={SECTION_SPACING}>
        <div className={FIELD_SPACING}>
          <Label htmlFor="username" className="text-sm font-medium text-foreground">
            {t("auth.username")}
          </Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => updateField("username", e.target.value)}
            placeholder={t("auth.username")}
            disabled={registerMutation.isPending}
            className={`h-11 ${fieldErrors.username ? "border-destructive" : ""}`}
          />
          {fieldErrors.username && (
            <p className="text-xs text-destructive">{fieldErrors.username}</p>
          )}
        </div>

        <div className={FIELD_SPACING}>
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            {t("auth.emailLabel")}
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            disabled={registerMutation.isPending}
            className={`h-11 ${fieldErrors.email ? "border-destructive" : ""}`}
          />
          {fieldErrors.email && (
            <p className="text-xs text-destructive">{fieldErrors.email}</p>
          )}
        </div>

        <div className={FIELD_SPACING}>
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            {t("auth.password")}
          </Label>
          <PasswordInput
            id="password"
            value={formData.password}
            onChange={(e) => updateField("password", e.target.value)}
            placeholder={t("auth.passwordPlaceholder")}
            minLength={8}
            disabled={registerMutation.isPending}
            className={`h-11 ${fieldErrors.password ? "border-destructive" : ""}`}
          />
          <PasswordStrengthMeter password={formData.password} />
          {fieldErrors.password && (
            <p className="text-xs text-destructive">{fieldErrors.password}</p>
          )}
        </div>

        <div className={FIELD_SPACING}>
          <Label htmlFor="passwordConfirmation" className="text-sm font-medium text-foreground">
            {t("auth.confirmPasswordLabel")}
          </Label>
          <PasswordInput
            id="passwordConfirmation"
            value={formData.confirmPassword}
            onChange={(e) => updateField("confirmPassword", e.target.value)}
            placeholder={t("auth.confirmPasswordLabel")}
            minLength={8}
            disabled={registerMutation.isPending}
            className={`h-11 ${fieldErrors.password_confirmation ? "border-destructive" : ""}`}
          />
          {fieldErrors.password_confirmation && (
            <p className="text-xs text-destructive">{fieldErrors.password_confirmation}</p>
          )}
        </div>

        <div className={FIELD_SPACING}>
          <Label className="text-sm font-medium text-muted-foreground">
            {t("auth.howDidYouHearWithOptional")}
          </Label>
          <Select
            value={formData.howDidYouHear || "none"}
            onValueChange={(v) => updateField("howDidYouHear", v === "none" ? "" : v)}
            disabled={registerMutation.isPending}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder={t("auth.howDidYouHearOptional")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("auth.howDidYouHearOptional")}</SelectItem>
              <SelectItem value="friend">{t("auth.howDidYouHearOptions.friend")}</SelectItem>
              <SelectItem value="social">{t("auth.howDidYouHearOptions.social")}</SelectItem>
              <SelectItem value="search">{t("auth.howDidYouHearOptions.search")}</SelectItem>
              <SelectItem value="ad">{t("auth.howDidYouHearOptions.ad")}</SelectItem>
              <SelectItem value="other">{t("auth.howDidYouHearOptions.other")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TermsBox />

        <div className="flex items-en gap-3">
          <Checkbox
            id="terms"
            checked={formData.termsAccepted}
            onCheckedChange={(checked) => updateField("termsAccepted", !!checked)}
            disabled={registerMutation.isPending}
            className={`mt-0.5 ${fieldErrors.termsAccepted ? "border-destructive" : ""}`}
          />
          <Label htmlFor="terms" className="cursor-pointer text-sm leading-relaxed">
            {t("auth.termsAgree")}
          </Label>
        </div>
        {fieldErrors.termsAccepted && (
          <p className="text-xs text-destructive">{fieldErrors.termsAccepted}</p>
        )}

        <div className="flex items-start gap-3">
          <Checkbox
            id="registerAsCompany"
            checked={formData.registerAsCompany}
            onCheckedChange={(checked) => updateField("registerAsCompany", !!checked)}
            disabled={registerMutation.isPending}
            className="mt-0.5"
          />
          <Label htmlFor="registerAsCompany" className="cursor-pointer text-sm leading-relaxed">
            {t("auth.registerAsCompany")}
          </Label>
        </div>
        {formData.registerAsCompany && (
          <CompanyFields
            value={{
              companyName: formData.companyName,
              regionId: formData.regionId,
              companyCityId: formData.companyCityId,
              companyProductTypes: formData.companyProductTypes,
              companyLicense: formData.companyLicense,
            }}
            onChange={(v) =>
              setFormData((prev) => ({
                ...prev,
                companyName: v.companyName ?? prev.companyName,
                regionId: v.regionId ?? prev.regionId,
                companyCityId: v.companyCityId ?? prev.companyCityId,
                companyProductTypes: v.companyProductTypes ?? prev.companyProductTypes,
                companyLicense: v.companyLicense ?? prev.companyLicense,
              }))
            }
            disabled={registerMutation.isPending}
          />
        )}
        {(fieldErrors.companyName || fieldErrors.companyCityId) && (
          <p className="text-xs text-destructive">
            {fieldErrors.companyName || fieldErrors.companyCityId}
          </p>
        )}

        {registerMutation.isError && !registerMutation.error?.response?.data?.errors && (
          <p className="text-xs text-destructive">
            {registerMutation.error?.response?.data?.message ?? t("auth.registerError")}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          <span className="ms-2">{t("auth.registerSubmit")}</span>
          {!registerMutation.isPending ? (
            <ArrowRight className="ms-2 size-4 rtl:rotate-180" />
          ) : null}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.hasAccount")}{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t("auth.loginLink")}
          </Link>
        </p>
      </form>
    </div>
  )
}

import { useState } from "react"
import { useNavigate, Link, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
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

const FORM_MAX_WIDTH = "max-w-md sm:max-w-xl"
const FIELD_SPACING = "space-y-2"
const SECTION_SPACING = "space-y-5"

function passwordMatchesPolicy(password, policy) {
  const minLength = Number(policy?.min_length ?? 6)
  if (password.length < minLength) return false

  const requires = Array.isArray(policy?.requires) ? policy.requires : ["letter", "number"]
  if (requires.includes("letter") && !/[A-Za-z]/.test(password)) return false
  if (requires.includes("number") && !/\d/.test(password)) return false
  if (requires.includes("uppercase") && !/[A-Z]/.test(password)) return false
  if (requires.includes("lowercase") && !/[a-z]/.test(password)) return false
  if (requires.includes("special") && !/[^\w\s]/.test(password)) return false
  return true
}

export function RegisterForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const raw = searchParams.get("redirect") || "/"
  const redirectTo = typeof raw === "string" && raw.startsWith("/") ? raw : "/"
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
  const [oathExpanded, setOathExpanded] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverNotice, setServerNotice] = useState("")
  const { data: passwordPolicy } = useQuery({
    queryKey: ["auth", "password-policy"],
    queryFn: authService.getPasswordPolicy,
    staleTime: 0,
    refetchOnMount: "always",
  })

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const registerMutation = useMutation({
    mutationFn: async () => {
      const registerRes = await authService.register({
        name: formData.username,
        email: formData.email,
        how_did_you_hear: formData.howDidYouHear || undefined,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
      })

      if (!formData.registerAsCompany) {
        return registerRes
      }

      const companyRes = await authService.registerCompany({
        company_name: formData.companyName.trim(),
        city_id: String(formData.companyCityId),
        product_types: formData.companyProductTypes?.trim() || undefined,
        license: formData.companyLicense || undefined,
      })

      return { ...registerRes, companyStatus: companyRes?.company_status }
    },
    onSuccess: (data) => {
      if (formData.registerAsCompany) {
        setServerNotice(
          data?.companyStatus?.status === "pending"
            ? t("auth.companyVerificationPending")
            : t("auth.companyVerificationSubmitted")
        )
      }
      navigate(redirectTo, { replace: true })
    },
    onError: (err) => {
      const data = err?.response?.data
      if (data?.errors) {
        const flat = {}
        for (const [k, v] of Object.entries(data.errors)) {
          const normalizedKey = k === "name" ? "username" : k
          flat[normalizedKey] = Array.isArray(v) ? v[0] : v
        }
        if (!flat.username && data?.errors?.name) {
          flat.username = t("auth.usernameTaken", "This username is already taken")
        }
        setFieldErrors(flat)
      }
    },
  })

  const handleRegister = (e) => {
    e.preventDefault()
    setFieldErrors({})
    setServerNotice("")
    const errs = {}
    if (!formData.username.trim()) errs.username = t("auth.usernameRequired")
    else if (formData.username.trim().length < 3) errs.username = t("auth.usernameMin")
    if (!formData.email.trim()) errs.email = t("auth.emailRequired")
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = t("auth.emailInvalid")
    if (!formData.password) errs.password = t("auth.passwordRequired")
    else if (!passwordMatchesPolicy(formData.password, passwordPolicy)) {
      errs.password = t("auth.passwordWeak")
    }
    if (formData.password !== formData.confirmPassword) {
      errs.password_confirmation = t("auth.passwordMismatch")
    }
    if (!oathExpanded) errs.oathExpanded = t("auth.oathSectionRequired", "يرجى الاطلاع على قسم التعهدات قبل المتابعة")
    if (!formData.termsAccepted) errs.termsAccepted = t("auth.oathCheckboxRequired", "يجب الإقرار والتعهد قبل إنشاء الحساب")
    if (formData.registerAsCompany) {
      if (!formData.companyName?.trim()) errs.companyName = t("auth.companyNameRequired")
      if (!formData.companyCityId) errs.companyCityId = t("auth.companyCityRequired")
      if (!formData.companyLicense) errs.companyLicense = t("auth.companyLicenseRequired")
    }
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    registerMutation.mutate()
  }

  return (
    <div
      className={`w-full ${FORM_MAX_WIDTH} rounded-xl border border-border bg-card p-4 shadow-sm sm:p-8`}
    >
      <h1 className="mb-6 text-xl font-semibold text-foreground sm:mb-8">
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
            minLength={Number(passwordPolicy?.min_length ?? 6)}
            disabled={registerMutation.isPending}
            className={`h-11 ${fieldErrors.password ? "border-destructive" : ""}`}
          />
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
            minLength={Number(passwordPolicy?.min_length ?? 6)}
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

        <TermsBox expanded={oathExpanded} onExpandedChange={(next) => {
          setOathExpanded(next)
          if (next) setFieldErrors((prev) => ({ ...prev, oathExpanded: undefined }))
        }} />
        {fieldErrors.oathExpanded && (
          <p className="text-xs text-destructive">{fieldErrors.oathExpanded}</p>
        )}

        <div className="flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={formData.termsAccepted}
            onCheckedChange={(checked) => updateField("termsAccepted", !!checked)}
            disabled={registerMutation.isPending}
            className={`mt-0.5 ${fieldErrors.termsAccepted ? "border-destructive" : ""}`}
          />
          <Label htmlFor="terms" className="cursor-pointer text-sm leading-relaxed">
            {t("auth.oathAgree")}
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
        {(fieldErrors.companyName || fieldErrors.companyCityId || fieldErrors.companyLicense) && (
          <p className="text-xs text-destructive">
            {fieldErrors.companyName || fieldErrors.companyCityId || fieldErrors.companyLicense}
          </p>
        )}

        {serverNotice ? <p className="text-xs text-green-600">{serverNotice}</p> : null}

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

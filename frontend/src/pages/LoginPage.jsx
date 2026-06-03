import { useState } from "react"
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import * as authService from "@/services/authService"
import { SeoHead } from "@/components/seo/SeoHead"
import { useResolvedSeo } from "@/hooks/useResolvedSeo"
import { Loader2, ArrowRight } from "lucide-react"

const FORM_MAX_WIDTH = "max-w-md sm:max-w-lg"
const FIELD_SPACING = "space-y-2"
const SECTION_SPACING = "space-y-5"

function loginErrorMessage(error, t) {
  const status = error?.response?.status
  const apiMessage = error?.response?.data?.message

  if (status === 401) return t("auth.loginError")
  if (status === 403 && typeof apiMessage === "string" && apiMessage.trim()) return apiMessage
  if (typeof apiMessage === "string" && apiMessage.trim()) return apiMessage
  return t("auth.loginError")
}

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const rawRedirect =
    location.state?.redirectTo
    || location.state?.from
    || searchParams.get("redirect")
    || "/"
  const redirectTo =
    typeof rawRedirect === "string" && rawRedirect.startsWith("/") ? rawRedirect : "/"

  const seoQuery = useResolvedSeo("/login")
  const seo = seoQuery.data

  const loginMutation = useMutation({
    mutationFn: () => authService.login(email, password),
    onSuccess: () => navigate(redirectTo, { replace: true }),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    loginMutation.mutate()
  }

  return (
    <div
      className={`w-full ${FORM_MAX_WIDTH} rounded-xl border border-border bg-card p-4 shadow-sm sm:p-8`}
    >
      <SeoHead
        path="/login"
        title={seo?.seo_title}
        description={seo?.description}
        image={seo?.og?.image}
        hreflang={seo?.hreflang}
        robots={seo?.robots ?? "index,follow"}
        useTitleAsFull={Boolean(seo?.seo_title)}
      />
      <h1 className="mb-6 text-end text-xl font-semibold text-foreground sm:mb-8">
        {t("auth.loginTitle")}
      </h1>
      <form onSubmit={handleSubmit} className={SECTION_SPACING}>
        <div className={FIELD_SPACING}>
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            {t("auth.emailLabel")}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loginMutation.isPending}
            className="h-11"
          />
        </div>
        <div className={FIELD_SPACING}>
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            {t("auth.password")}
          </Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={t("auth.passwordPlaceholder")}
            autoComplete="current-password"
            disabled={loginMutation.isPending}
            className="h-11"
          />
        </div>
        {loginMutation.isError && (
          <p className="text-xs text-destructive">
            {loginErrorMessage(loginMutation.error, t)}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          <span className="ms-2">{t("auth.loginButton")}</span>
          {!loginMutation.isPending ? (
            <ArrowRight className="ms-2 size-4 rtl:rotate-180" />
          ) : null}
        </Button>
        {/* <p className="text-end text-xs">
          {t("auth.forgotPasswordQuestion")}{" "}
          <Link
            to="/forgot-password"
            className="font-medium text-primary hover:underline"
          >
            {t("auth.recoverAccount")}
          </Link>
        </p> */}
        <p className="text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link
            to={redirectTo !== "/" ? `/register?redirect=${encodeURIComponent(redirectTo)}` : "/register"}
            className="font-medium text-primary hover:underline"
          >
            {t("auth.registerLink")}
          </Link>
        </p>
      </form>
    </div>
  )
}

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import * as authService from "@/services/authService"
import { Loader2, ArrowRight } from "lucide-react"

const FORM_MAX_WIDTH = "max-w-lg"
const FIELD_SPACING = "space-y-2"
const SECTION_SPACING = "space-y-5"

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const loginMutation = useMutation({
    mutationFn: () => authService.login(email, password),
    onSuccess: () => navigate("/", { replace: true }),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    loginMutation.mutate()
  }

  return (
    <div
      className={`w-full ${FORM_MAX_WIDTH} rounded-xl border border-border bg-card p-8 shadow-sm`}
    >
      <h1 className="mb-8 text-end text-xl font-semibold text-foreground">
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
            {loginMutation.error?.response?.data?.message ?? t("auth.loginError")}
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
          <Link to="/register" className="font-medium text-primary hover:underline">
            {t("auth.registerLink")}
          </Link>
        </p>
      </form>
    </div>
  )
}

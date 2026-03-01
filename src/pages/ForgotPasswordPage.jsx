import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as authService from "@/services/authService"
import { Loader2, ArrowLeft, Mail } from "lucide-react"

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")

  const mutation = useMutation({
    mutationFn: () => authService.forgotPassword(email),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="flex w-full justify-center">
    <Card className="w-full max-w-md border-0 shadow-xl sm:border">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t("auth.forgotPassword")}</CardTitle>
        <CardDescription>{t("auth.forgotPasswordDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={mutation.isPending}
            />
          </div>
          {mutation.isSuccess && (
            <p className="text-sm text-green-600 dark:text-green-500">
              {t("auth.forgotPasswordSuccess")}
            </p>
          )}
          {mutation.isError && (
            <p className="text-sm text-destructive">
              {mutation.error?.response?.data?.message ?? t("auth.forgotPasswordError")}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {t("auth.sendResetLink")}
          </Button>
        </form>
        <Button variant="ghost" asChild className="mt-4 w-full">
          <Link to="/login" className="flex items-center justify-center gap-2">
            <ArrowLeft className="size-4 rtl-rotate" />
            {t("auth.backToLogin")}
          </Link>
        </Button>
      </CardContent>
    </Card>
    </div>
  )
}

import { useRouteError } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function ErrorFallback() {
  const error = useRouteError()
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="size-4" />
        <AlertTitle>{t("common.errorTitle", "Something went wrong")}</AlertTitle>
        <AlertDescription>
          {error?.message ?? t("common.errorGeneric", "An unexpected error occurred.")}
        </AlertDescription>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          {t("common.reload", "Reload page")}
        </Button>
      </Alert>
    </div>
  )
}

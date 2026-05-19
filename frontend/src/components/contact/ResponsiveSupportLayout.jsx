import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { PageLoadingShell } from "@/components/ui/PageLoadingShell"
import { PAGE_CONTAINER_CLASS } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

export function ResponsiveSupportLayout({ title, isLoading, isError, onRetry, children }) {
  const { t } = useTranslation()

  useEffect(() => {
    if (title) document.title = `${title} | ${t("contactPage.pageTitle", "Contact")}`
  }, [title, t])

  if (isLoading) {
    return <PageLoadingShell variant="contact" />
  }

  if (isError) {
    return (
      <div className={cn(PAGE_CONTAINER_CLASS, "py-16 text-center")}>
        <p className="text-muted-foreground">{t("common.error")}</p>
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          {t("common.retry", "Retry")}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn(PAGE_CONTAINER_CLASS, "space-y-10 py-8 md:space-y-14 md:py-12 overflow-x-hidden")}>
      {children}
    </div>
  )
}

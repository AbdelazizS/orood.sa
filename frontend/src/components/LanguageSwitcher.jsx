import { useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { Languages, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const [isSwitching, setIsSwitching] = useState(false)

  const changeLanguage = async (lang) => {
    if (lang === i18n.language) return
    setIsSwitching(true)
    try {
      await i18n.changeLanguage(lang)
    } finally {
      setTimeout(() => setIsSwitching(false), 400)
    }
  }

  const currentLabel = i18n.language === "ar" ? "العربية" : "English"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" aria-label="Language switcher">
            <Languages className="size-4" />
            {currentLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[170px]">
          <DropdownMenuItem onClick={() => changeLanguage("ar")}>العربية</DropdownMenuItem>
          <DropdownMenuItem onClick={() => changeLanguage("en")}>English</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {isSwitching &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm transition">
            <div className="flex items-center gap-3 rounded-2xl bg-card px-8 py-5 shadow-2xl">
              <Loader2 className="size-5 animate-spin text-primary" />
              <p className="text-lg font-semibold text-foreground">{t("common.updatingLayout")}</p>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Optional AR/EN name fields. If empty, base name displays in both locales.
 */
export function LocalizedNameFields({ name, nameAr, nameEn, onNameChange, onNameArChange, onNameEnChange, nameLabel = "admin.name", required = true }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <div>
        <Label>{t(nameLabel)} {required && "*"}</Label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t("admin.namePlaceholder", "Name (used if AR/EN empty)")}
          required={required}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-muted-foreground">{t("admin.nameAr", "Arabic name")} ({t("common.optional", "optional")})</Label>
        <Input
          value={nameAr ?? ""}
          onChange={(e) => onNameArChange(e.target.value || null)}
          placeholder={t("admin.nameArPlaceholder", "الاسم بالعربية")}
          className="mt-1"
          dir="rtl"
        />
      </div>
      <div>
        <Label className="text-muted-foreground">{t("admin.nameEn", "English name")} ({t("common.optional", "optional")})</Label>
        <Input
          value={nameEn ?? ""}
          onChange={(e) => onNameEnChange(e.target.value || null)}
          placeholder={t("admin.nameEnPlaceholder", "Name in English")}
          className="mt-1"
        />
      </div>
    </div>
  )
}

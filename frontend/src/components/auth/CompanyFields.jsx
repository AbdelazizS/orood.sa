import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import apiClient from "@/lib/apiClient"
import { useMainCategories } from "@/hooks/useCategories"
import { Checkbox } from "@/components/ui/checkbox"
import { COMPANY_ACTIVITIES } from "@/lib/video/videoFormat"
import { Upload } from "lucide-react"

export function CompanyFields({ value, onChange, disabled }) {
  const { t } = useTranslation()

  const { data: categories = [] } = useMainCategories()

  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data } = await apiClient.get("/regions")
      return data?.data ?? data ?? []
    },
  })

  const selectedRegion = regions.find((r) => String(r.id) === String(value?.regionId))
  const cities = selectedRegion?.cities ?? []

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    onChange?.({ ...value, companyLicense: file || null })
  }

  return (
    <div className="space-y-4 rounded-md border border-dashed border-border p-4">
      <div className="space-y-2">
        <Label htmlFor="companyName">{t("auth.companyName")}</Label>
        <Input
          id="companyName"
          value={value?.companyName ?? ""}
          onChange={(e) => onChange?.({ ...value, companyName: e.target.value })}
          placeholder={t("auth.companyNamePlaceholder")}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("auth.companyMainCategory")}</Label>
        <Select
          value={value?.companyCategoryId ? String(value.companyCategoryId) : ""}
          onValueChange={(v) => onChange?.({ ...value, companyCategoryId: v ? Number(v) : null })}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("auth.companyMainCategoryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t("auth.companyCity")}</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            value={value?.regionId ? String(value.regionId) : ""}
            onValueChange={(v) =>
              onChange?.({ ...value, regionId: v ? Number(v) : null, companyCityId: null })
            }
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("auth.selectRegion")} />
            </SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={value?.companyCityId ? String(value.companyCityId) : ""}
            onValueChange={(v) => onChange?.({ ...value, companyCityId: v ? Number(v) : null })}
            disabled={disabled || !value?.regionId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("auth.selectCity")} />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {categories.find((c) => String(c.id) === String(value?.companyCategoryId))?.slug === "real-estate" ? (
        <div className="space-y-2">
          <Label>{t("auth.companyActivities", "نشاط الشركة العقارية")}</Label>
          <div className="flex flex-wrap gap-4">
            {COMPANY_ACTIVITIES.map((a) => {
              const list = value?.companyActivities ?? []
              return (
                <label key={a} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={list.includes(a)}
                    disabled={disabled}
                    onCheckedChange={(on) =>
                      onChange?.({ ...value, companyActivities: on === true ? [...new Set([...list, a])] : list.filter((x) => x !== a) })
                    }
                  />
                  {t(`companyChannel.activity.${a}`, a)}
                </label>
              )
            })}
          </div>
          <Label htmlFor="companyFalLicense" className="mt-2 block">{t("auth.falLicense", "رقم رخصة فال (اختياري)")}</Label>
          <Input
            id="companyFalLicense"
            dir="ltr"
            inputMode="numeric"
            maxLength={50}
            value={value?.companyFalLicense ?? ""}
            onChange={(e) => onChange?.({ ...value, companyFalLicense: e.target.value.replace(/[^0-9A-Za-z-]/g, "") })}
            disabled={disabled}
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="companyProductTypes">{t("auth.companyProductTypes")}</Label>
        <Input
          id="companyProductTypes"
          value={value?.companyProductTypes ?? ""}
          onChange={(e) => onChange?.({ ...value, companyProductTypes: e.target.value })}
          placeholder={t("auth.companyProductTypesPlaceholder")}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("auth.companyLicense")}</Label>
        <label
          className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50 ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <Upload className="size-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {value?.companyLicense
              ? value.companyLicense.name
              : t("auth.companyLicensePlaceholder")}
          </span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
        </label>
      </div>
    </div>
  )
}

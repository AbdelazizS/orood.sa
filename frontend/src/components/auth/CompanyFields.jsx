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
import { Upload } from "lucide-react"

export function CompanyFields({ value, onChange, disabled }) {
  const { t } = useTranslation()

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

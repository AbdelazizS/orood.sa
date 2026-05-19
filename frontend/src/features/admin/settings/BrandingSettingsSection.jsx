import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, RotateCcw, Upload } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AppLogo } from "@/components/common/AppLogo"
import { resolveImageUrl } from "@/lib/imageUrl"
import { useTheme } from "@/providers/ThemeProvider"
import {
  useAdminBranding,
  useUpdateBranding,
  useUploadBrandingAsset,
} from "@/hooks/useBranding"

const ASSET_KEYS = [
  { key: "logo_light", labelKey: "admin.branding.assets.logoLight" },
  { key: "logo_dark", labelKey: "admin.branding.assets.logoDark" },
  { key: "logo_footer", labelKey: "admin.branding.assets.logoFooter" },
  { key: "logo_preloader_mark", labelKey: "admin.branding.assets.preloaderMark" },
  { key: "favicon", labelKey: "admin.branding.assets.favicon" },
  { key: "app_icon", labelKey: "admin.branding.assets.appIcon" },
]

const PLACEMENT_KEYS = ["navbar", "sidebar", "footer", "preloader", "auth", "mobile_nav"]

function AssetUploadCard({ assetKey, label, url, onUpload, uploading }) {
  const resolved = url ? resolveImageUrl(url) : null

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div
        className="flex h-24 items-center justify-center rounded-md border border-dashed bg-[length:12px_12px] bg-checkered"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
        }}
      >
        {resolved ? (
          <img src={resolved} alt="" className="max-h-20 max-w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
      <label className="inline-flex cursor-pointer">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(file, assetKey)
            e.target.value = ""
          }}
        />
        <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
          <span>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            <span className="ms-2">{uploading ? "…" : "Upload"}</span>
          </span>
        </Button>
      </label>
    </div>
  )
}

function PlacementFields({ placement, values, onChange, t }) {
  const fields = [
    { key: "width_px", label: t("admin.branding.placement.width", "Width (px)") },
    { key: "width_px_desktop", label: t("admin.branding.placement.widthDesktop", "Width desktop (px)") },
    { key: "height_px", label: t("admin.branding.placement.height", "Height (px)") },
    { key: "max_height_px", label: t("admin.branding.placement.maxHeight", "Max height (px)") },
    { key: "padding_px", label: t("admin.branding.placement.padding", "Padding (px)") },
  ]

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <p className="text-sm font-medium">{t(`admin.branding.placements.${placement}`, placement)}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(({ key, label }) =>
          values[key] !== undefined || key === "width_px" || key === "max_height_px" ? (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                type="number"
                min={0}
                value={values[key] ?? ""}
                onChange={(e) =>
                  onChange(placement, key, e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
          ) : null,
        )}
        <div className="space-y-1">
          <Label className="text-xs">{t("admin.branding.placement.objectFit", "Object fit")}</Label>
          <Select
            value={values.object_fit ?? "contain"}
            onValueChange={(v) => onChange(placement, "object_fit", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contain">contain</SelectItem>
              <SelectItem value="cover">cover</SelectItem>
              <SelectItem value="fill">fill</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

export function BrandingSettingsSection() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const query = useAdminBranding()
  const updateMutation = useUpdateBranding()
  const uploadMutation = useUploadBrandingAsset()

  const [draft, setDraft] = useState(null)
  const [uploadingKey, setUploadingKey] = useState(null)

  useEffect(() => {
    if (query.data) {
      setDraft(JSON.parse(JSON.stringify(query.data)))
    }
  }, [query.data])

  const dirty = useMemo(() => {
    if (!draft || !query.data) return false
    return JSON.stringify(draft) !== JSON.stringify(query.data)
  }, [draft, query.data])

  if (query.isLoading || !draft) {
    return (
      <div className="flex min-h-[20vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const handlePlacementChange = (placement, field, value) => {
    setDraft((prev) => ({
      ...prev,
      placements: {
        ...prev.placements,
        [placement]: {
          ...prev.placements?.[placement],
          [field]: value === "" ? undefined : value,
        },
      },
    }))
  }

  const handleSave = () => {
    updateMutation.mutate(
      {
        assets: draft.assets,
        placements: draft.placements,
        legal: draft.legal,
        footer: draft.footer,
        transparent_background: draft.transparent_background,
        preserve_aspect_ratio: draft.preserve_aspect_ratio,
      },
      {
        onSuccess: (data) => setDraft(JSON.parse(JSON.stringify(data))),
      },
    )
  }

  const handleReset = () => {
    updateMutation.mutate(
      { reset_defaults: true },
      {
        onSuccess: (data) => setDraft(JSON.parse(JSON.stringify(data))),
      },
    )
  }

  const handleUpload = async (file, assetKey) => {
    setUploadingKey(assetKey)
    try {
      const result = await uploadMutation.mutateAsync({ file, assetKey })
      setDraft((prev) => ({
        ...prev,
        assets: { ...prev.assets, [assetKey]: result.url },
      }))
    } finally {
      setUploadingKey(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.branding.title", "Branding")}</CardTitle>
          <CardDescription>{t("admin.branding.description", "Manage logos, sizes per placement, and legal footer text.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t(
              "admin.branding.guidance",
              "Navbar/footer: Logo (light/dark). Sidebar & browser tab: Favicon. Splash screen only: Preloader mark (separate upload).",
            )}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ASSET_KEYS.map(({ key, labelKey }) => (
              <AssetUploadCard
                key={key}
                assetKey={key}
                label={t(labelKey, key)}
                url={draft.assets?.[key]}
                uploading={uploadingKey === key}
                onUpload={handleUpload}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.branding.placementsTitle", "Placement sizes")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {PLACEMENT_KEYS.map((placement) => (
            <PlacementFields
              key={placement}
              placement={placement}
              values={draft.placements?.[placement] ?? {}}
              onChange={handlePlacementChange}
              t={t}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.branding.legalTitle", "Legal text")}</CardTitle>
          <CardDescription>{t("admin.branding.legalHint", "Use {year} for the current year.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>{t("admin.branding.copyrightAr", "Copyright (Arabic)")}</Label>
            <Input
              value={draft.legal?.copyright_ar ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  legal: { ...prev.legal, copyright_ar: e.target.value },
                }))
              }
              dir="rtl"
            />
          </div>
          <div className="space-y-1">
            <Label>{t("admin.branding.copyrightEn", "Copyright (English)")}</Label>
            <Input
              value={draft.legal?.copyright_en ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  legal: { ...prev.legal, copyright_en: e.target.value },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.branding.footerTitle", "Footer & developer credit")}</CardTitle>
          <CardDescription>
            {t(
              "admin.branding.footerHint",
              "Footer tagline under the logo and developer credit in the bottom bar.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show_developer_credit"
              checked={draft.footer?.show_developer_credit ?? true}
              onCheckedChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, show_developer_credit: Boolean(checked) },
                }))
              }
            />
            <Label htmlFor="show_developer_credit" className="font-normal">
              {t("admin.branding.showDeveloperCredit", "Show developer credit")}
            </Label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("admin.branding.developerNameAr", "Developer name (Arabic)")}</Label>
              <Input
                value={draft.footer?.developer_name_ar ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, developer_name_ar: e.target.value },
                  }))
                }
                dir="rtl"
              />
            </div>
            <div className="space-y-1">
              <Label>{t("admin.branding.developerNameEn", "Developer name (English)")}</Label>
              <Input
                value={draft.footer?.developer_name_en ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, developer_name_en: e.target.value },
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("admin.branding.developerLinkedIn", "LinkedIn URL")}</Label>
            <Input
              type="url"
              value={draft.footer?.developer_linkedin_url ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, developer_linkedin_url: e.target.value },
                }))
              }
              placeholder="https://www.linkedin.com/in/..."
              dir="ltr"
            />
          </div>
          <div className="space-y-1">
            <Label>{t("admin.branding.footerTaglineAr", "Footer tagline (Arabic)")}</Label>
            <Textarea
              value={draft.footer?.footer_tagline_ar ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, footer_tagline_ar: e.target.value },
                }))
              }
              rows={2}
              dir="rtl"
            />
          </div>
          <div className="space-y-1">
            <Label>{t("admin.branding.footerTaglineEn", "Footer tagline (English)")}</Label>
            <Textarea
              value={draft.footer?.footer_tagline_en ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, footer_tagline_en: e.target.value },
                }))
              }
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("admin.branding.previewTitle", "Live preview")}</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={toggleTheme}>
            {theme === "dark" ? t("admin.branding.lightMode", "Light") : t("admin.branding.darkMode", "Dark")}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-4">
            <p className="text-xs font-medium text-muted-foreground">{t("admin.branding.previewNavbar", "Navbar")}</p>
            <div className="flex items-center border-b py-2">
              <AppLogo placement="navbar" alt="" />
            </div>
          </div>
          <div className="space-y-2 rounded-lg border p-4">
            <p className="text-xs font-medium text-muted-foreground">{t("admin.branding.previewFooter", "Footer")}</p>
            <AppLogo placement="footer" alt="" />
          </div>
          <div className="space-y-2 rounded-lg border p-4 flex flex-col items-center gap-4">
            <p className="text-xs font-medium text-muted-foreground">{t("admin.branding.previewPreloader", "Preloader")}</p>
            <AppLogo placement="preloader" alt="" />
            <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <div className="space-y-2 rounded-lg border bg-primary p-4">
            <p className="text-xs font-medium text-primary-foreground/80">{t("admin.branding.previewAuth", "Auth header")}</p>
            <div className="rounded-lg bg-primary-foreground/95 inline-block px-3 py-2">
              <AppLogo placement="auth" alt="" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!dirty || updateMutation.isPending} onClick={handleSave}>
          {t("common.save", "Save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!dirty || updateMutation.isPending}
          onClick={() => setDraft(JSON.parse(JSON.stringify(query.data)))}
        >
          {t("common.cancel", "Cancel")}
        </Button>
        <Button type="button" variant="secondary" disabled={updateMutation.isPending} onClick={handleReset}>
          <RotateCcw className="size-4 me-2" />
          {t("admin.branding.resetDefaults", "Reset sizes & legal to defaults")}
        </Button>
      </div>
    </div>
  )
}

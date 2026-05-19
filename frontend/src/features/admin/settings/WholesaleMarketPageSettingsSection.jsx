import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { useUpdateWholesaleMarketPageSettings } from "@/hooks/useAdminSettings"
import { WHOLESALE_PAGE_COPY_FIELD_KEYS } from "@/features/admin/settings/wholesaleMarketPageFieldKeys"

function emptyCopyBlock() {
  return Object.fromEntries(WHOLESALE_PAGE_COPY_FIELD_KEYS.map((k) => [k, ""]))
}

const FALLBACK_WHOLESALE_PAGE = Object.freeze({
  show_hero: true,
  show_quick_filters: true,
  show_how_it_works: true,
  show_trust: true,
  copy: { ar: {}, en: {} },
})

export function WholesaleMarketPageSettingsSection({ settings }) {
  const { t } = useTranslation()
  const mutation = useUpdateWholesaleMarketPageSettings()
  const wp = settings?.wholesale_market_page ?? FALLBACK_WHOLESALE_PAGE

  const [showHero, setShowHero] = useState(Boolean(wp.show_hero))
  const [showQuickFilters, setShowQuickFilters] = useState(Boolean(wp.show_quick_filters))
  const [showHowItWorks, setShowHowItWorks] = useState(Boolean(wp.show_how_it_works))
  const [showTrust, setShowTrust] = useState(Boolean(wp.show_trust))
  const [copyAr, setCopyAr] = useState(() => ({ ...emptyCopyBlock(), ...(wp.copy?.ar ?? {}) }))
  const [copyEn, setCopyEn] = useState(() => ({ ...emptyCopyBlock(), ...(wp.copy?.en ?? {}) }))
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const dirty = useMemo(() => {
    const baseline = settings?.wholesale_market_page ?? FALLBACK_WHOLESALE_PAGE
    if (showHero !== Boolean(baseline.show_hero)) return true
    if (showQuickFilters !== Boolean(baseline.show_quick_filters)) return true
    if (showHowItWorks !== Boolean(baseline.show_how_it_works)) return true
    if (showTrust !== Boolean(baseline.show_trust)) return true
    for (const k of WHOLESALE_PAGE_COPY_FIELD_KEYS) {
      if ((copyAr[k] ?? "") !== (baseline.copy?.ar?.[k] ?? "")) return true
      if ((copyEn[k] ?? "") !== (baseline.copy?.en?.[k] ?? "")) return true
    }
    return false
  }, [settings?.wholesale_market_page, showHero, showQuickFilters, showHowItWorks, showTrust, copyAr, copyEn])

  const reset = () => {
    const baseline = settings?.wholesale_market_page ?? FALLBACK_WHOLESALE_PAGE
    setShowHero(Boolean(baseline.show_hero))
    setShowQuickFilters(Boolean(baseline.show_quick_filters))
    setShowHowItWorks(Boolean(baseline.show_how_it_works))
    setShowTrust(Boolean(baseline.show_trust))
    setCopyAr({ ...emptyCopyBlock(), ...(baseline.copy?.ar ?? {}) })
    setCopyEn({ ...emptyCopyBlock(), ...(baseline.copy?.en ?? {}) })
  }

  const save = () => {
    mutation.mutate({
      show_hero: showHero,
      show_quick_filters: showQuickFilters,
      show_how_it_works: showHowItWorks,
      show_trust: showTrust,
      copy: { ar: copyAr, en: copyEn },
    })
  }

  const fieldLabel = (key) => t(`admin.wholesalePageField.${key}`, key)

  const renderLangFields = (lang, values, setValues) => (
    <div className="max-h-[60vh] space-y-4 overflow-y-auto pe-1">
      {WHOLESALE_PAGE_COPY_FIELD_KEYS.map((key) => (
        <div key={`${lang}-${key}`} className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">{fieldLabel(key)}</Label>
          <Textarea
            rows={key.includes("body") || key.includes("subtitle") ? 4 : 2}
            value={values[key] ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
            className="text-sm"
            placeholder={t("admin.wholesalePageCopyPlaceholder", "Leave empty to use default translation")}
          />
        </div>
      ))}
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.wholesaleMarketPageTitle", "Wholesale market page")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("admin.wholesaleMarketPageHint", "Show or hide sections on /wholesale. Optional copy overrides default Arabic/English UI text when filled.")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label className="text-sm font-medium">{t("admin.wholesaleShowHero", "Hero block")}</Label>
          <Switch checked={showHero} onCheckedChange={setShowHero} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label className="text-sm font-medium">{t("admin.wholesaleShowQuickFilters", "Group status filters")}</Label>
          <Switch checked={showQuickFilters} onCheckedChange={setShowQuickFilters} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label className="text-sm font-medium">{t("admin.wholesaleShowHow", "How it works")}</Label>
          <Switch checked={showHowItWorks} onCheckedChange={setShowHowItWorks} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label className="text-sm font-medium">{t("admin.wholesaleShowTrust", "Trust and safety")}</Label>
          <Switch checked={showTrust} onCheckedChange={setShowTrust} />
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-between gap-2">
              {t("admin.wholesalePageAdvancedCopy", "Advanced copy (optional)")}
              <ChevronDown className={`size-4 shrink-0 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 rounded-lg border p-3">
            <Tabs defaultValue="ar">
              <TabsList className="mb-4">
                <TabsTrigger value="ar">{t("common.arabic")}</TabsTrigger>
                <TabsTrigger value="en">{t("common.english")}</TabsTrigger>
              </TabsList>
              <TabsContent value="ar">{renderLangFields("ar", copyAr, setCopyAr)}</TabsContent>
              <TabsContent value="en">{renderLangFields("en", copyEn, setCopyEn)}</TabsContent>
            </Tabs>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-2">
          <Button type="button" disabled={!dirty || mutation.isPending} onClick={save}>
            {t("common.save", "Save")}
          </Button>
          <Button type="button" variant="outline" disabled={!dirty || mutation.isPending} onClick={reset}>
            {t("common.cancel", "Cancel")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

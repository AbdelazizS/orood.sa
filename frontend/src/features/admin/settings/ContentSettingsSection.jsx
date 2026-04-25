import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useUpdateContentSettings } from "@/hooks/useAdminSettings"

export function ContentSettingsSection({ settings }) {
  const { t } = useTranslation()
  const mutation = useUpdateContentSettings()

  const [autoPublish, setAutoPublish] = useState(Boolean(settings?.listings_auto_publish_on_create ?? true))
  const [defaultBidsVisible, setDefaultBidsVisible] = useState(Boolean(settings?.default_bids_visible ?? true))
  const [defaultCommentsVisible, setDefaultCommentsVisible] = useState(Boolean(settings?.default_comments_visible ?? true))

  const dirty = useMemo(() => (
    autoPublish !== Boolean(settings?.listings_auto_publish_on_create ?? true)
    || defaultBidsVisible !== Boolean(settings?.default_bids_visible ?? true)
    || defaultCommentsVisible !== Boolean(settings?.default_comments_visible ?? true)
  ), [autoPublish, defaultBidsVisible, defaultCommentsVisible, settings])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.contentSettingsTitle", "Content defaults")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">{t("admin.autoPublishListings", "Auto-publish listings on create")}</Label>
            <p className="mt-1 text-xs text-muted-foreground">{t("admin.autoPublishListingsHint", "If disabled, listings enter pending review.")}</p>
          </div>
          <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">{t("admin.defaultBidsVisible", "Default bids visibility")}</Label>
            <p className="mt-1 text-xs text-muted-foreground">{t("admin.defaultBidsVisibleHint", "New listings show bids by default.")}</p>
          </div>
          <Switch checked={defaultBidsVisible} onCheckedChange={setDefaultBidsVisible} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">{t("admin.defaultCommentsVisible", "Default comments visibility")}</Label>
            <p className="mt-1 text-xs text-muted-foreground">{t("admin.defaultCommentsVisibleHint", "New listings allow comments by default.")}</p>
          </div>
          <Switch checked={defaultCommentsVisible} onCheckedChange={setDefaultCommentsVisible} />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={!dirty || mutation.isPending}
            onClick={() => mutation.mutate({
              listings_auto_publish_on_create: autoPublish,
              default_bids_visible: defaultBidsVisible,
              default_comments_visible: defaultCommentsVisible,
            })}
          >
            {t("common.save", "Save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || mutation.isPending}
            onClick={() => {
              setAutoPublish(Boolean(settings?.listings_auto_publish_on_create ?? true))
              setDefaultBidsVisible(Boolean(settings?.default_bids_visible ?? true))
              setDefaultCommentsVisible(Boolean(settings?.default_comments_visible ?? true))
            }}
          >
            {t("common.cancel", "Cancel")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


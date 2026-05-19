import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useUpdateContactSettings } from "@/hooks/useAdminSettings"
import { ExternalLink, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

const CHANNEL_TYPES = ["email", "phone", "whatsapp", "telegram", "url", "ticket", "business", "address"]

function newId() {
  return `ch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function ContactSettingsSection({ settings }) {
  const { t } = useTranslation()
  const mutation = useUpdateContactSettings()
  const initial = settings?.contact ?? {}

  const [form, setForm] = useState({
    hero_kicker_ar: initial.hero_kicker_ar ?? "",
    hero_kicker_en: initial.hero_kicker_en ?? "",
    hero_title_ar: initial.hero_title_ar ?? "",
    hero_title_en: initial.hero_title_en ?? "",
    hero_subtitle_ar: initial.hero_subtitle_ar ?? "",
    hero_subtitle_en: initial.hero_subtitle_en ?? "",
    response_time_ar: initial.response_time_ar ?? "",
    response_time_en: initial.response_time_en ?? "",
    hours_ar: initial.hours_ar ?? "",
    hours_en: initial.hours_en ?? "",
    form_enabled: initial.form_enabled ?? true,
    success_message_ar: initial.success_message_ar ?? "",
    success_message_en: initial.success_message_en ?? "",
    notify_emails: (initial.notify_emails ?? []).join(", "),
    channels: initial.channels ?? [],
    trust_indicators: initial.trust_indicators ?? [],
    inquiry_types: initial.inquiry_types ?? [],
    form_fields: initial.form_fields ?? [],
    faq: initial.faq ?? { title_ar: "", title_en: "", items: [] },
    trust_blocks: initial.trust_blocks ?? [],
  })

  const save = () => {
    mutation.mutate(
      {
        ...form,
        notify_emails: form.notify_emails.split(",").map((s) => s.trim()).filter(Boolean),
      },
      {
        onSuccess: () => toast.success(t("common.saved", "Saved")),
        onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
      },
    )
  }

  const updateList = (key, index, patch) => {
    setForm((prev) => {
      const list = [...(prev[key] ?? [])]
      list[index] = { ...list[index], ...patch }
      return { ...prev, [key]: list }
    })
  }

  const addChannel = () => {
    setForm((prev) => ({
      ...prev,
      channels: [
        ...(prev.channels ?? []),
        {
          id: newId(),
          type: "email",
          label_ar: "",
          label_en: "",
          description_ar: "",
          description_en: "",
          cta_label_ar: "",
          cta_label_en: "",
          value: "",
          visible: true,
          sort_order: (prev.channels?.length ?? 0) + 1,
        },
      ],
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground flex-1 min-w-[200px]">
          {t("admin.contactSettingsIntro")}
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/contact" target="_blank" rel="noreferrer">
            {t("admin.previewContactPage")} <ExternalLink className="ms-1 size-3" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/contact-inquiries">{t("admin.contactInquiries")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.contactHero")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("admin.contactHeroKickerAr", "Kicker (AR)")}</Label>
            <Input value={form.hero_kicker_ar} onChange={(e) => setForm((p) => ({ ...p, hero_kicker_ar: e.target.value }))} />
          </div>
          <div>
            <Label>{t("admin.contactHeroKickerEn", "Kicker (EN)")}</Label>
            <Input value={form.hero_kicker_en} onChange={(e) => setForm((p) => ({ ...p, hero_kicker_en: e.target.value }))} />
          </div>
          <div>
            <Label>{t("admin.contactHeroTitleAr")}</Label>
            <Input value={form.hero_title_ar} onChange={(e) => setForm((p) => ({ ...p, hero_title_ar: e.target.value }))} />
          </div>
          <div>
            <Label>{t("admin.contactHeroTitleEn")}</Label>
            <Input value={form.hero_title_en} onChange={(e) => setForm((p) => ({ ...p, hero_title_en: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("admin.contactHeroSubtitleAr")}</Label>
            <Textarea value={form.hero_subtitle_ar} onChange={(e) => setForm((p) => ({ ...p, hero_subtitle_ar: e.target.value }))} rows={2} />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("admin.contactHeroSubtitleEn")}</Label>
            <Textarea value={form.hero_subtitle_en} onChange={(e) => setForm((p) => ({ ...p, hero_subtitle_en: e.target.value }))} rows={2} />
          </div>
          <div>
            <Label>{t("admin.responseTimeAr", "Response time (AR)")}</Label>
            <Input value={form.response_time_ar} onChange={(e) => setForm((p) => ({ ...p, response_time_ar: e.target.value }))} />
          </div>
          <div>
            <Label>{t("admin.responseTimeEn", "Response time (EN)")}</Label>
            <Input value={form.response_time_en} onChange={(e) => setForm((p) => ({ ...p, response_time_en: e.target.value }))} />
          </div>
          <div>
            <Label>{t("admin.hoursAr", "Hours (AR)")}</Label>
            <Input value={form.hours_ar} onChange={(e) => setForm((p) => ({ ...p, hours_ar: e.target.value }))} />
          </div>
          <div>
            <Label>{t("admin.hoursEn", "Hours (EN)")}</Label>
            <Input value={form.hours_en} onChange={(e) => setForm((p) => ({ ...p, hours_en: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("admin.contactChannels")}</CardTitle>
            <CardDescription>{t("admin.contactChannelsDesc")}</CardDescription>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addChannel} className="gap-1">
            <Plus className="size-4" /> {t("common.add", "Add")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {(form.channels ?? []).map((ch, i) => (
            <div key={ch.id ?? i} className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <select
                  className="h-9 rounded-md border px-2 text-sm"
                  value={ch.type ?? "email"}
                  onChange={(e) => updateList("channels", i, { type: e.target.value })}
                >
                  {CHANNEL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <Switch checked={ch.visible !== false} onCheckedChange={(v) => updateList("channels", i, { visible: Boolean(v) })} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setForm((p) => ({ ...p, channels: p.channels.filter((_, idx) => idx !== i) }))}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <Input value={ch.value ?? ""} placeholder={t("admin.channelValue", "Value / link")} onChange={(e) => updateList("channels", i, { value: e.target.value })} />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={ch.label_ar ?? ""} placeholder={t("admin.labelAr")} onChange={(e) => updateList("channels", i, { label_ar: e.target.value })} />
                <Input value={ch.label_en ?? ""} placeholder={t("admin.labelEn", "Label EN")} onChange={(e) => updateList("channels", i, { label_en: e.target.value })} />
                <Input value={ch.description_ar ?? ""} placeholder={t("admin.descriptionAr", "Description AR")} onChange={(e) => updateList("channels", i, { description_ar: e.target.value })} />
                <Input value={ch.description_en ?? ""} placeholder={t("admin.descriptionEn", "Description EN")} onChange={(e) => updateList("channels", i, { description_en: e.target.value })} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.contactForm")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>{t("admin.contactFormEnabled")}</Label>
            <Switch checked={form.form_enabled} onCheckedChange={(v) => setForm((p) => ({ ...p, form_enabled: Boolean(v) }))} />
          </div>
          <div>
            <Label>{t("admin.notifyEmails")}</Label>
            <Input value={form.notify_emails} onChange={(e) => setForm((p) => ({ ...p, notify_emails: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("admin.successMessageAr", "Success message (AR)")}</Label>
              <Textarea value={form.success_message_ar} onChange={(e) => setForm((p) => ({ ...p, success_message_ar: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>{t("admin.successMessageEn", "Success message (EN)")}</Label>
              <Textarea value={form.success_message_en} onChange={(e) => setForm((p) => ({ ...p, success_message_en: e.target.value }))} rows={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("admin.inquiryTypes", "Inquiry types")}</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setForm((p) => ({
                ...p,
                inquiry_types: [
                  ...(p.inquiry_types ?? []),
                  { key: `type-${Date.now()}`, label_ar: "", label_en: "", visible: true, sort_order: (p.inquiry_types?.length ?? 0) + 1 },
                ],
              }))
            }
          >
            <Plus className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(form.inquiry_types ?? []).map((item, i) => (
            <div key={item.key ?? i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
              <Input value={item.key ?? ""} placeholder="key" onChange={(e) => updateList("inquiry_types", i, { key: e.target.value })} />
              <Input value={item.label_ar ?? ""} placeholder={t("admin.labelAr")} onChange={(e) => updateList("inquiry_types", i, { label_ar: e.target.value })} />
              <Input value={item.label_en ?? ""} placeholder={t("admin.labelEn", "EN")} onChange={(e) => updateList("inquiry_types", i, { label_en: e.target.value })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("admin.contactFaq", "FAQ")}</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setForm((p) => ({
                ...p,
                faq: {
                  ...p.faq,
                  items: [
                    ...(p.faq?.items ?? []),
                    { question_ar: "", question_en: "", answer_ar: "", answer_en: "", visible: true, sort_order: (p.faq?.items?.length ?? 0) + 1 },
                  ],
                },
              }))
            }
          >
            <Plus className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={form.faq?.title_ar ?? ""}
              placeholder={t("admin.faqTitleAr", "FAQ title AR")}
              onChange={(e) => setForm((p) => ({ ...p, faq: { ...p.faq, title_ar: e.target.value } }))}
            />
            <Input
              value={form.faq?.title_en ?? ""}
              placeholder={t("admin.faqTitleEn", "FAQ title EN")}
              onChange={(e) => setForm((p) => ({ ...p, faq: { ...p.faq, title_en: e.target.value } }))}
            />
          </div>
          {(form.faq?.items ?? []).map((item, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-3">
              <Input value={item.question_ar ?? ""} placeholder={t("admin.questionAr", "Question AR")} onChange={(e) => {
                const items = [...(form.faq?.items ?? [])]
                items[i] = { ...items[i], question_ar: e.target.value }
                setForm((p) => ({ ...p, faq: { ...p.faq, items } }))
              }} />
              <Textarea value={item.answer_ar ?? ""} placeholder={t("admin.answerAr", "Answer AR")} rows={2} onChange={(e) => {
                const items = [...(form.faq?.items ?? [])]
                items[i] = { ...items[i], answer_ar: e.target.value }
                setForm((p) => ({ ...p, faq: { ...p.faq, items } }))
              }} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("admin.trustBlocks", "Trust & safety")}</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setForm((p) => ({
                ...p,
                trust_blocks: [
                  ...(p.trust_blocks ?? []),
                  { icon: "shield-check", title_ar: "", title_en: "", body_ar: "", body_en: "", visible: true, sort_order: (p.trust_blocks?.length ?? 0) + 1 },
                ],
              }))
            }
          >
            <Plus className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(form.trust_blocks ?? []).map((block, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
              <Input value={block.title_ar ?? ""} placeholder={t("admin.titleAr", "Title AR")} onChange={(e) => updateList("trust_blocks", i, { title_ar: e.target.value })} />
              <Input value={block.title_en ?? ""} placeholder={t("admin.titleEn", "Title EN")} onChange={(e) => updateList("trust_blocks", i, { title_en: e.target.value })} />
              <Textarea className="sm:col-span-2" value={block.body_ar ?? ""} placeholder={t("admin.bodyAr", "Body AR")} rows={2} onChange={(e) => updateList("trust_blocks", i, { body_ar: e.target.value })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button disabled={mutation.isPending} onClick={save}>
        {t("common.save")}
      </Button>
    </div>
  )
}

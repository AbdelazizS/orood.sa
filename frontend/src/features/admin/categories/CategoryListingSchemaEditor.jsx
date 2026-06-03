import { useMemo, useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Plus, Trash2, Upload, Save } from "lucide-react"
import { toast } from "sonner"
import { LUCIDE_ICON_OPTIONS } from "@/lib/lucideIconOptions"
import { DynamicIcon } from "@/components/ui/DynamicIcon"

import { Checkbox } from "@/components/ui/checkbox"

const FIELD_TYPES = ["text", "number", "textarea", "select", "switch", "tags", "features", "checkbox"]

const RE_PROPERTY_TYPES = [
  { value: "apartment", labelKey: "realEstate.types.apartment" },
  { value: "villa", labelKey: "realEstate.types.villa" },
  { value: "land", labelKey: "realEstate.types.land" },
  { value: "building", labelKey: "realEstate.types.building" },
  { value: "floor", labelKey: "realEstate.types.floor" },
  { value: "shop", labelKey: "realEstate.types.shop" },
  { value: "farm", labelKey: "realEstate.types.farm" },
]

function normalizeOptions(options = []) {
  return options.map((opt, i) => ({
    value: opt.value ?? `opt_${i}`,
    label_ar: opt.label_ar ?? opt.label ?? "",
    label_en: opt.label_en ?? opt.label ?? "",
  }))
}

function optionLabel(opt, locale) {
  if (opt.label) return opt.label
  return locale?.startsWith("en") ? opt.label_en || opt.label_ar : opt.label_ar || opt.label_en
}

export function CategoryListingSchemaEditor({ categoryId, categorySlug = null, subcategoryId = null }) {
  const { t, i18n } = useTranslation()
  const isRealEstate = categorySlug === "real-estate"
  const queryClient = useQueryClient()
  const [newSection, setNewSection] = useState({ section_key: "", title_ar: "", title_en: "" })
  const [newField, setNewField] = useState({
    field_key: "",
    field_type: "text",
    label_ar: "",
    label_en: "",
    required: false,
    section_id: null,
  })

  const listKey = ["admin", "category-schemas", categoryId, subcategoryId]

  const { data: schemaList = [], isLoading: listLoading } = useQuery({
    queryKey: listKey,
    queryFn: async () => {
      const params = { category_id: categoryId, all: 1 }
      if (subcategoryId) params.subcategory_id = subcategoryId
      const { data } = await apiClient.get("/admin/category-schemas", { params })
      return data?.data ?? []
    },
    enabled: Boolean(categoryId),
  })

  const activeSchemaMeta = useMemo(() => {
    const draft = schemaList.find((s) => s.status === "draft")
    if (draft) return draft
    return schemaList.find((s) => s.status === "published") ?? null
  }, [schemaList])

  const schemaId = activeSchemaMeta?.id

  const { data: schemaDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin", "category-schema", schemaId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/admin/category-schemas/${schemaId}`)
      return data?.data ?? null
    },
    enabled: Boolean(schemaId),
  })

  const isPublished = schemaDetail?.status === "published"
  const isReadOnly = isPublished

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: listKey })
    if (schemaId) queryClient.invalidateQueries({ queryKey: ["admin", "category-schema", schemaId] })
  }

  const createSchemaMutation = useMutation({
    mutationFn: () =>
      apiClient.post("/admin/category-schemas", {
        category_id: categoryId,
        subcategory_id: subcategoryId,
        listing_type: "offer",
      }),
    onSuccess: () => {
      invalidate()
      toast.success(t("admin.schemaCreated", "تم إنشاء المخطط"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  const addSectionMutation = useMutation({
    mutationFn: (payload) => apiClient.post(`/admin/category-schemas/${schemaId}/sections`, payload),
    onSuccess: () => {
      invalidate()
      setNewSection({ section_key: "", title_ar: "", title_en: "" })
    },
  })

  const addFieldMutation = useMutation({
    mutationFn: (payload) => apiClient.post(`/admin/category-schemas/${schemaId}/fields`, payload),
    onSuccess: () => {
      invalidate()
      setNewField({
        field_key: "",
        field_type: "text",
        label_ar: "",
        label_en: "",
        required: false,
        section_id: null,
      })
    },
  })

  const updateFieldMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.put(`/admin/category-schema-fields/${id}`, payload),
    onSuccess: () => {
      invalidate()
      toast.success(t("admin.saveField", "حفظ الحقل"))
    },
  })

  const deleteFieldMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/category-schema-fields/${id}`),
    onSuccess: invalidate,
  })

  const updatePolicyMutation = useMutation({
    mutationFn: (payload) => apiClient.put(`/admin/category-schemas/${schemaId}/policy`, payload),
    onSuccess: () => {
      invalidate()
      toast.success(t("common.saved", "تم الحفظ"))
    },
  })

  const publishMutation = useMutation({
    mutationFn: () => apiClient.post(`/admin/category-schemas/${schemaId}/publish`),
    onSuccess: () => {
      invalidate()
      toast.success(t("admin.schemaPublished", "تم نشر المخطط"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  const cloneSchemaMutation = useMutation({
    mutationFn: () => apiClient.post(`/admin/category-schemas/${schemaId}/clone`),
    onSuccess: () => {
      invalidate()
      toast.success(t("admin.schemaCloned", "تم إنشاء مسودة للتعديل"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  const duplicateSectionMutation = useMutation({
    mutationFn: (sectionId) =>
      apiClient.post(`/admin/category-schemas/${schemaId}/sections/${sectionId}/duplicate`),
    onSuccess: invalidate,
  })

  const reorderFieldsMutation = useMutation({
    mutationFn: (payload) => apiClient.put(`/admin/category-schemas/${schemaId}/reorder`, payload),
    onSuccess: invalidate,
  })

  const sections = (schemaDetail?.sections ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const fields = (schemaDetail?.fields ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const locationMode = schemaDetail?.policy?.location_policy?.mode ?? "region_only"

  const updateFeatureOptions = (field, nextOptions) => {
    updateFieldMutation.mutate({
      id: field.id,
      payload: { options: nextOptions },
    })
  }

  const updateFieldIcon = (field, iconName) => {
    const config = { ...(field.config_json ?? {}), icon: iconName || null }
    if (!iconName) delete config.icon
    updateFieldMutation.mutate({
      id: field.id,
      payload: { config_json: config },
    })
  }

  if (listLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!schemaId) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          {t("admin.listingSchemaEmpty", "لا يوجد مخطط إعلان لهذا القسم بعد.")}
        </p>
        <Button type="button" size="sm" onClick={() => createSchemaMutation.mutate()} disabled={createSchemaMutation.isPending}>
          {createSchemaMutation.isPending ? <Loader2 className="me-2 size-4 animate-spin" /> : <Plus className="me-2 size-4" />}
          {t("admin.createListingSchema", "إنشاء مخطط إعلان")}
        </Button>
      </div>
    )
  }

  if (detailLoading && !schemaDetail) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{t("admin.listingSchemaTitle", "مخطط الإعلان")}</p>
          <p className="text-xs text-muted-foreground">
            {t("admin.listingSchemaVersion", "الإصدار")} {schemaDetail?.version ?? 1}
            {" · "}
            <Badge variant={isPublished ? "default" : "secondary"} className="text-[10px]">
              {isPublished ? t("admin.published", "منشور") : t("admin.draft", "مسودة")}
            </Badge>
          </p>
        </div>
        {!isReadOnly ? (
          <Button type="button" size="sm" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
            <Upload className="me-2 size-4" />
            {t("admin.publishSchema", "نشر المخطط")}
          </Button>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs text-muted-foreground">{t("admin.publishedSchemaHint", "المخطط المنشور يعمل على /add.")}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => cloneSchemaMutation.mutate()} disabled={cloneSchemaMutation.isPending}>
              <Plus className="me-1 size-4" />
              {t("admin.createDraftSchema", "مسودة جديدة للتعديل")}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("admin.locationPolicy", "سياسة الموقع")}</Label>
          <Select
            value={locationMode}
            disabled={isReadOnly}
            onValueChange={(mode) =>
              updatePolicyMutation.mutate({
                location_policy: {
                  ...(schemaDetail?.policy?.location_policy ?? {}),
                  mode,
                  required: mode === "exact_map",
                },
              })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exact_map">{t("admin.locationExactMap", "خريطة دقيقة")}</SelectItem>
              <SelectItem value="city_only">{t("admin.locationCityOnly", "مدينة فقط")}</SelectItem>
              <SelectItem value="region_only">{t("admin.locationRegionOnly", "منطقة فقط")}</SelectItem>
              <SelectItem value="hidden">{t("admin.locationHidden", "مخفي")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isRealEstate ? (
        <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {t(
            "admin.listingSchemaRealEstateHint",
            "هذه الحقول تخص قسم العقارات فقط. تظهر في صفحة نشر الإعلان (/add) حسب الفرع المختار (شقة، مزرعة، …). لكل فرع حقول مختلفة — مثلاً «المساحة» للشقة، «عرض الأرض» للمزرعة."
          )}
        </p>
      ) : null}

      {sections.map((section) => {
        const sectionFields = fields.filter((f) => f.section_id === section.id)
        return (
          <div key={section.id} className="space-y-2 rounded-md border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{section.title_ar || section.section_key}</p>
              {!isReadOnly ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => duplicateSectionMutation.mutate(section.id)}
                  disabled={duplicateSectionMutation.isPending}
                >
                  {t("admin.duplicateSection", "نسخ القسم")}
                </Button>
              ) : null}
            </div>
            {sectionFields.map((field) => (
              <SchemaFieldEditor
                key={field.id}
                field={field}
                readOnly={isReadOnly}
                isRealEstate={isRealEstate}
                locale={i18n.language}
                onDelete={() => deleteFieldMutation.mutate(field.id)}
                onSave={(payload) => updateFieldMutation.mutate({ id: field.id, payload })}
                onOptionsChange={(opts) => updateFeatureOptions(field, opts)}
                onIconChange={(icon) => updateFieldIcon(field, icon)}
                isSaving={updateFieldMutation.isPending}
              />
            ))}
          </div>
        )
      })}

      {!isReadOnly ? (
        <>
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <p className="text-xs font-medium text-muted-foreground">{t("admin.addSection", "إضافة قسم")}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                placeholder={t("admin.sectionKey", "مفتاح القسم")}
                value={newSection.section_key}
                onChange={(e) => setNewSection((s) => ({ ...s, section_key: e.target.value }))}
              />
              <Input
                placeholder={t("admin.labelAr", "العنوان عربي")}
                value={newSection.title_ar}
                onChange={(e) => setNewSection((s) => ({ ...s, title_ar: e.target.value }))}
              />
              <Input
                placeholder={t("admin.labelEn", "العنوان إنجليزي")}
                value={newSection.title_en}
                onChange={(e) => setNewSection((s) => ({ ...s, title_en: e.target.value }))}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!newSection.section_key || !newSection.title_ar || addSectionMutation.isPending}
              onClick={() => addSectionMutation.mutate(newSection)}
            >
              <Plus className="me-1 size-4" />
              {t("admin.addSection", "إضافة قسم")}
            </Button>
          </div>

          <div className="space-y-2 rounded-md border border-dashed p-3">
            <p className="text-xs font-medium text-muted-foreground">{t("admin.addField", "إضافة حقل")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder={t("admin.fieldKey", "مفتاح الحقل")}
                value={newField.field_key}
                onChange={(e) => setNewField((f) => ({ ...f, field_key: e.target.value }))}
              />
              <Select value={newField.field_type} onValueChange={(v) => setNewField((f) => ({ ...f, field_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((ft) => (
                    <SelectItem key={ft} value={ft}>
                      {ft}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={t("admin.labelAr", "التسمية عربي")}
                value={newField.label_ar}
                onChange={(e) => setNewField((f) => ({ ...f, label_ar: e.target.value }))}
              />
              <Input
                placeholder={t("admin.labelEn", "التسمية إنجليزي")}
                value={newField.label_en}
                onChange={(e) => setNewField((f) => ({ ...f, label_en: e.target.value }))}
              />
              <Select
                value={newField.section_id ? String(newField.section_id) : ""}
                onValueChange={(v) => setNewField((f) => ({ ...f, section_id: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.pickSection", "اختر القسم")} />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.title_ar || s.section_key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={newField.required}
                  onCheckedChange={(checked) => setNewField((f) => ({ ...f, required: checked }))}
                />
                {t("admin.required", "مطلوب")}
              </label>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={
                !newField.field_key ||
                !newField.label_ar ||
                !newField.section_id ||
                addFieldMutation.isPending
              }
              onClick={() =>
                addFieldMutation.mutate({
                  ...newField,
                  options: newField.field_type === "features" ? [] : undefined,
                })
              }
            >
              <Plus className="me-1 size-4" />
              {t("admin.addField", "إضافة حقل")}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}

function describeVisibleWhen(visibleWhen, t) {
  if (!visibleWhen || typeof visibleWhen !== "object") {
    return t("admin.fieldAlwaysVisible", "يظهر دائماً")
  }
  const parts = []
  if (Array.isArray(visibleWhen.property_type) && visibleWhen.property_type.length) {
    const labels = visibleWhen.property_type.map((v) =>
      t(`realEstate.types.${v}`, v)
    )
    parts.push(t("admin.visibleWhenTypes", "يظهر عند: {{types}}", { types: labels.join("، ") }))
  }
  if (visibleWhen.purpose === "rent") {
    parts.push(t("admin.visibleWhenRent", "للإيجار فقط"))
  }
  return parts.length ? parts.join(" · ") : t("admin.fieldAlwaysVisible", "يظهر دائماً")
}

function canEditPropertyTypeVisibility(visibleWhen) {
  if (!visibleWhen) return true
  return Boolean(visibleWhen.property_type) && !visibleWhen.purpose
}

function SchemaFieldEditor({
  field,
  readOnly,
  isRealEstate,
  locale,
  onDelete,
  onSave,
  onOptionsChange,
  onIconChange,
  isSaving,
}) {
  const { t } = useTranslation()
  const [labelAr, setLabelAr] = useState(field.label_ar ?? "")
  const [labelEn, setLabelEn] = useState(field.label_en ?? "")
  const [required, setRequired] = useState(Boolean(field.required))
  const [alwaysVisible, setAlwaysVisible] = useState(!field.visible_when)
  const [visibleTypes, setVisibleTypes] = useState(
    Array.isArray(field.visible_when?.property_type) ? [...field.visible_when.property_type] : []
  )

  useEffect(() => {
    setLabelAr(field.label_ar ?? "")
    setLabelEn(field.label_en ?? "")
    setRequired(Boolean(field.required))
    setAlwaysVisible(!field.visible_when)
    setVisibleTypes(
      Array.isArray(field.visible_when?.property_type) ? [...field.visible_when.property_type] : []
    )
  }, [field.id, field.label_ar, field.label_en, field.required, field.visible_when])

  const showPropertyTypePicker =
    isRealEstate && canEditPropertyTypeVisibility(field.visible_when)

  const handleSave = () => {
    const payload = {
      label_ar: labelAr.trim(),
      label_en: labelEn.trim() || null,
      required,
    }
    if (showPropertyTypePicker) {
      payload.visible_when =
        alwaysVisible || visibleTypes.length === 0 ? null : { property_type: visibleTypes }
    }
    onSave(payload)
  }

  const toggleVisibleType = (value, checked) => {
    setVisibleTypes((prev) => {
      if (checked) return prev.includes(value) ? prev : [...prev, value]
      return prev.filter((v) => v !== value)
    })
    setAlwaysVisible(false)
  }

  return (
    <div className="rounded border p-3 space-y-3 bg-background">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{field.label_ar || field.field_key}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {field.field_key} · {field.field_type}
          </p>
          {readOnly ? (
            <p className="mt-1 text-xs text-muted-foreground">{describeVisibleWhen(field.visible_when, t)}</p>
          ) : null}
        </div>
        {!readOnly ? (
          <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>

      {!readOnly ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("admin.labelAr", "التسمية عربي")}</Label>
              <Input value={labelAr} onChange={(e) => setLabelAr(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("admin.labelEn", "التسمية إنجليزي")}</Label>
              <Input value={labelEn} onChange={(e) => setLabelEn(e.target.value)} className="h-9" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={required} onCheckedChange={setRequired} />
            {t("admin.required", "مطلوب")}
          </label>

          {showPropertyTypePicker ? (
            <div className="space-y-2 rounded-md border border-dashed p-2">
              <Label className="text-xs">{t("admin.fieldVisibleWhen", "يظهر عند اختيار الفرع")}</Label>
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={alwaysVisible}
                  onCheckedChange={(checked) => {
                    setAlwaysVisible(Boolean(checked))
                    if (checked) setVisibleTypes([])
                  }}
                />
                {t("admin.fieldAlwaysVisible", "يظهر دائماً")}
              </label>
              {!alwaysVisible ? (
                <div className="flex flex-wrap gap-2">
                  {RE_PROPERTY_TYPES.map(({ value, labelKey }) => (
                    <label key={value} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                      <Checkbox
                        checked={visibleTypes.includes(value)}
                        onCheckedChange={(checked) => toggleVisibleType(value, Boolean(checked))}
                      />
                      {t(labelKey, value)}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          ) : field.visible_when ? (
            <p className="text-xs text-muted-foreground">{describeVisibleWhen(field.visible_when, t)}</p>
          ) : null}

          <Button type="button" size="sm" variant="secondary" onClick={handleSave} disabled={isSaving || !labelAr.trim()}>
            {isSaving ? <Loader2 className="me-1 size-4 animate-spin" /> : <Save className="me-1 size-4" />}
            {t("admin.saveField", "حفظ الحقل")}
          </Button>
        </>
      ) : null}

      {["select", "condition", "features"].includes(field.field_type) ? (
        <FieldOptionsEditor field={field} locale={locale} readOnly={readOnly} onChange={onOptionsChange} />
      ) : null}

      {["switch", "checkbox", "features"].includes(field.field_type) ? (
        <div className="space-y-1.5">
          <Label className="text-xs">{t("admin.fieldIcon", "أيقونة العرض")}</Label>
          <Select
            value={field.config_json?.icon || "none"}
            disabled={readOnly}
            onValueChange={(v) => onIconChange(v === "none" ? "" : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("common.none", "بدون")}</SelectItem>
              {LUCIDE_ICON_OPTIONS.map((ic) => (
                <SelectItem key={ic} value={ic}>
                  <span className="flex items-center gap-2">
                    <DynamicIcon name={ic} className="size-4" />
                    {ic}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  )
}

function FieldOptionsEditor({ field, locale, readOnly, onChange }) {
  const { t } = useTranslation()
  const options = normalizeOptions(field.options ?? [])

  const addRow = () => {
    const key = `feature_${Date.now()}`
    onChange([...options, { value: key, label_ar: "", label_en: "" }])
  }

  const updateRow = (index, patch) => {
    onChange(options.map((o, i) => (i === index ? { ...o, ...patch } : o)))
  }

  const removeRow = (index) => {
    onChange(options.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t("admin.featureOptions", "خيارات المميزات")}</p>
      {options.map((opt, index) => (
        <div key={opt.value} className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground w-16 truncate">{optionLabel(opt, locale)}</span>
          <Input
            className="h-8 flex-1 min-w-[100px]"
            placeholder={t("admin.labelAr", "عربي")}
            value={opt.label_ar}
            disabled={readOnly}
            onChange={(e) => updateRow(index, { label_ar: e.target.value })}
          />
          <Input
            className="h-8 flex-1 min-w-[100px]"
            placeholder={t("admin.labelEn", "English")}
            value={opt.label_en}
            disabled={readOnly}
            onChange={(e) => updateRow(index, { label_en: e.target.value })}
          />
          {!readOnly ? (
            <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeRow(index)}>
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      ))}
      {!readOnly ? (
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="me-1 size-4" />
          {t("admin.addFeature", "إضافة ميزة")}
        </Button>
      ) : null}
    </div>
  )
}

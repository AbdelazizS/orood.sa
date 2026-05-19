import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

function optionIsSelected(valueList, optValue) {
  if (!Array.isArray(valueList)) return false
  const target = String(optValue)
  return valueList.some((v) => String(v) === target)
}

function toggleOptionValue(valueList, optValue, checked) {
  const target = String(optValue)
  const list = Array.isArray(valueList) ? [...valueList] : []
  const has = list.some((v) => String(v) === target)
  if (checked && !has) return [...list, optValue]
  if (!checked) return list.filter((v) => String(v) !== target)
  return list
}

export function DynamicFieldRenderer({ field, value, onChange, error }) {
  const { t } = useTranslation()
  const id = `schema-${field.field_key}`

  if (field.field_type === "divider") {
    return <hr className="my-3 border-border/60" />
  }
  if (field.field_type === "info" || field.field_type === "warning") {
    return (
      <p
        className={cn(
          "rounded-lg px-3 py-2 text-sm",
          field.field_type === "warning"
            ? "border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100"
            : "bg-muted/40 text-muted-foreground",
        )}
      >
        {field.label}
      </p>
    )
  }

  const set = (v) => onChange(field.field_key, v)

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {field.label}
        {field.required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null}

      {["text", "number", "amount", "date", "email"].includes(field.field_type) ? (
        <Input
          id={id}
          type={field.field_type === "number" || field.field_type === "amount" ? "number" : field.field_type === "date" ? "date" : "text"}
          value={value != null && value !== "" ? String(value) : ""}
          placeholder={field.placeholder ?? ""}
          onChange={(e) => set(e.target.value)}
          className={cn(error && "border-destructive")}
        />
      ) : null}

      {field.field_type === "textarea" || field.field_type === "richtext" ? (
        <Textarea
          id={id}
          value={value ?? ""}
          placeholder={field.placeholder ?? ""}
          rows={4}
          onChange={(e) => set(e.target.value)}
          className={cn(error && "border-destructive")}
        />
      ) : null}

      {["select", "radio", "condition"].includes(field.field_type) ? (
        (field.options ?? []).length === 0 ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t("dynamicListing.selectOptionsMissing", "لا توجد خيارات لهذا الحقل — راجع إعدادات المخطط.")}
          </p>
        ) : (
          <Select
            value={value != null && value !== "" ? String(value) : undefined}
            onValueChange={set}
          >
            <SelectTrigger id={id} className={cn(error && "border-destructive")}>
              <SelectValue placeholder={field.placeholder ?? t("common.select", "اختر")} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      ) : null}

      {field.field_type === "switch" ? (
        <div className="flex items-center gap-2">
          <Switch id={id} checked={!!value} onCheckedChange={set} />
          <span className="text-sm text-muted-foreground">{field.label}</span>
        </div>
      ) : null}

      {field.field_type === "checkbox" ? (
        <label className="flex items-center gap-2">
          <Checkbox id={id} checked={!!value} onCheckedChange={set} />
          <span className="text-sm">{field.placeholder ?? field.label}</span>
        </label>
      ) : null}

      {field.field_type === "tags" ? (
        <Input
          id={id}
          value={Array.isArray(value) ? value.join(", ") : value ?? ""}
          placeholder={field.placeholder ?? t("dynamicListing.tagsPlaceholder", "افصل بفاصلة")}
          onChange={(e) =>
            set(
              e.target.value
                .split(/[,،]/)
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          className={cn(error && "border-destructive")}
        />
      ) : null}

      {field.field_type === "features" ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {(field.options ?? []).map((opt) => {
            const selected = optionIsSelected(value, opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => set(toggleOptionValue(value, opt.value, !selected))}
                className={cn(
                  "relative flex min-h-[72px] flex-col items-center justify-center rounded-lg border px-2 py-2.5 text-center text-[11px] font-medium leading-tight transition-colors sm:text-xs",
                  selected
                    ? "border-primary bg-primary/5 text-foreground shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50",
                )}
              >
                {selected ? (
                  <span className="absolute end-1.5 top-1.5 size-1.5 rounded-full bg-primary" aria-hidden />
                ) : null}
                {opt.label}
              </button>
            )
          })}
        </div>
      ) : null}

      {field.field_type === "multiselect" ? (
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((opt) => {
            const selected = optionIsSelected(value, opt.value)
            return (
              <label key={opt.value} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) => set(toggleOptionValue(value, opt.value, checked))}
                />
                {opt.label}
              </label>
            )
          })}
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

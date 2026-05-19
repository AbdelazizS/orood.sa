import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SAUDI_IBAN_EXAMPLE_FORMATTED } from "@/lib/finance/iban"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FinanceFileField } from "@/components/finance/FinanceFileField"
import { isFileFieldType } from "@/lib/finance/iban"

const LAYOUT_FIELD_TYPES = new Set(["divider", "info", "warning", "instruction_block"])

/** Renders admin-configured payment method fields. */
export function DynamicFormRenderer({
  fields = [],
  values = {},
  onChange,
  errors = {},
  uploadContext,
  fileFormatHint,
}) {
  const { t } = useTranslation()
  if (!fields.length) return null

  const ibanExample = t("finance.ibanExampleFormatted", SAUDI_IBAN_EXAMPLE_FORMATTED)

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const id = `pm-field-${field.field_key}`
        const label = field.label || field.field_key
        const err = errors[field.field_key]

        if (field.is_layout_block || LAYOUT_FIELD_TYPES.has(field.field_type)) {
          if (field.field_type === "divider") {
            return <hr key={field.field_key} className="border-border" />
          }
          const text = field.help || field.label
          if (!text) return null
          return (
            <p key={field.field_key} className="text-sm text-muted-foreground">
              {text}
            </p>
          )
        }

        if (field.field_type === "textarea") {
          return (
            <div key={field.field_key} className="space-y-2">
              <Label htmlFor={id}>{label}{field.required ? " *" : ""}</Label>
              <Textarea
                id={id}
                value={values[field.field_key] ?? ""}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                placeholder={field.placeholder}
              />
              {err ? <p className="text-sm text-destructive">{err}</p> : null}
            </div>
          )
        }

        if (field.field_type === "select" && field.options?.length) {
          return (
            <div key={field.field_key} className="space-y-2">
              <Label>{label}{field.required ? " *" : ""}</Label>
              <Select value={values[field.field_key] ?? ""} onValueChange={(v) => onChange(field.field_key, v)}>
                <SelectTrigger>
                  <SelectValue placeholder={field.placeholder || label} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={String(opt.value ?? opt)} value={String(opt.value ?? opt)}>
                      {opt.label ?? String(opt.value ?? opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {err ? <p className="text-sm text-destructive">{err}</p> : null}
            </div>
          )
        }

        if (field.field_type === "iban") {
          return (
            <div key={field.field_key} className="space-y-2">
              <Label htmlFor={id}>{label}{field.required ? " *" : ""}</Label>
              <Input
                id={id}
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                spellCheck={false}
                value={values[field.field_key] ?? ""}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                placeholder={
                  field.placeholder ||
                  t("finance.ibanPlaceholder", SAUDI_IBAN_EXAMPLE_FORMATTED)
                }
                className="font-mono text-sm tracking-wide"
              />
              <p className="text-xs text-muted-foreground">
                {t("finance.ibanExampleOnly", "مثال: {{example}}", { example: ibanExample })}
              </p>
              {err ? <p className="text-sm text-destructive">{err}</p> : null}
            </div>
          )
        }

        if (field.field_type === "checkbox") {
          return (
            <div key={field.field_key} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={Boolean(values[field.field_key])}
                onCheckedChange={(c) => onChange(field.field_key, Boolean(c))}
              />
              <Label htmlFor={id}>{label}</Label>
              {err ? <p className="text-sm text-destructive">{err}</p> : null}
            </div>
          )
        }

        if (isFileFieldType(field.field_type) || field.field_key === "receipt_url") {
          return (
            <FinanceFileField
              key={field.field_key}
              id={id}
              label={label}
              required={field.required}
              value={values[field.field_key] ?? ""}
              onChange={(url) => onChange(field.field_key, url)}
              error={err}
              uploadContext={uploadContext}
              formatHint={
                field.field_key === "receipt_url" || isFileFieldType(field.field_type)
                  ? fileFormatHint
                  : undefined
              }
            />
          )
        }

        return (
          <div key={field.field_key} className="space-y-2">
            <Label htmlFor={id}>{label}{field.required ? " *" : ""}</Label>
            <Input
              id={id}
              type={field.field_type === "amount" || field.field_type === "number" ? "number" : "text"}
              value={values[field.field_key] ?? ""}
              onChange={(e) => onChange(field.field_key, e.target.value)}
              placeholder={field.placeholder}
            />
            {field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null}
            {err ? <p className="text-sm text-destructive">{err}</p> : null}
          </div>
        )
      })}
    </div>
  )
}

import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle2, X } from "lucide-react"
import { saudiPhoneFieldError } from "@/lib/phone/saudiPhone"

export function DynamicSupportForm({
  page,
  onSubmit,
  onReset,
  isPending,
  isSuccess,
  successMessage,
  defaultInquiryType = null,
  formTitle = null,
}) {
  const { t } = useTranslation()
  const [values, setValues] = useState({})
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState({})

  const fields = page?.form_fields ?? []

  useEffect(() => {
    if (!defaultInquiryType) return
    setValues((prev) => {
      if (prev.inquiry_type === defaultInquiryType) return prev
      return { ...prev, inquiry_type: defaultInquiryType }
    })
  }, [defaultInquiryType])

  const validate = () => {
    const next = {}
    for (const field of fields) {
      const key = field.field_key
      const val = values[key]
      if (field.required && (val === undefined || val === "")) {
        next[key] = t("contactPage.validation.required", "This field is required")
      }
      if (field.field_type === "phone" && val) {
        const phoneErr = saudiPhoneFieldError(val, t)
        if (phoneErr) next[key] = phoneErr
      }
      if (key === "message" && val && String(val).trim().length < 10) {
        next[key] = t("contactPage.validation.messageMin", "Message must be at least 10 characters")
      }
    }
    if (fields.some((f) => f.field_key === "attachments") && files.length > 3) {
      next.attachments = t("contactPage.validation.tooManyFiles", "Maximum 3 files")
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== "") formData.append(key, value)
    })
    files.forEach((file) => formData.append("attachments[]", file))

    onSubmit(formData)
  }

  const fileField = useMemo(() => fields.find((f) => f.field_type === "file"), [fields])

  if (isSuccess) {
    return (
      <Card className="border-primary/20">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 className="size-12 text-primary" aria-hidden />
          <p className="text-lg font-medium">{successMessage}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setValues({})
              setFiles([])
              onReset?.()
            }}
          >
            {t("contactPage.sendAnother", "Send another message")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{formTitle ?? t("contactPage.formTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {fields.map((field) => {
            if (field.field_type === "file") return null
            const key = field.field_key
            const err = errors[key]

            if (field.field_type === "textarea") {
              return (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>
                    {field.label}
                    {field.required ? " *" : ""}
                  </Label>
                  <Textarea
                    id={key}
                    rows={5}
                    className="min-h-[120px] resize-y"
                    value={values[key] ?? ""}
                    onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                    aria-invalid={Boolean(err)}
                  />
                  {err ? <p className="text-xs text-destructive">{err}</p> : null}
                </div>
              )
            }

            if (field.field_type === "select") {
              return (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>
                    {field.label}
                    {field.required ? " *" : ""}
                  </Label>
                  <select
                    id={key}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={values[key] ?? ""}
                    onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                  >
                    <option value="">{t("contactPage.selectPlaceholder", "Choose...")}</option>
                    {(field.options ?? []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {err ? <p className="text-xs text-destructive">{err}</p> : null}
                </div>
              )
            }

            return (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>
                  {field.label}
                  {field.required ? " *" : ""}
                </Label>
                <Input
                  id={key}
                  type={
                    field.field_type === "email"
                      ? "email"
                      : field.field_type === "phone"
                        ? "tel"
                        : "text"
                  }
                  className="min-h-11"
                  value={values[key] ?? ""}
                  onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                  aria-invalid={Boolean(err)}
                />
                {err ? <p className="text-xs text-destructive">{err}</p> : null}
              </div>
            )
          })}

          {fileField ? (
            <div className="space-y-2">
              <Label htmlFor="attachments">
                {fileField.label}
                {fileField.required ? " *" : ""}
              </Label>
              <Input
                id="attachments"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                className="min-h-11"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              {files.length > 0 ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {files.map((file, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                      <span className="truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {errors.attachments ? (
                <p className="text-xs text-destructive">{errors.attachments}</p>
              ) : null}
            </div>
          ) : null}

          <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : t("contactPage.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  SAUDI_PHONE_INPUT_PROPS,
  contactPhoneFieldError,
  formatSaudiPhoneInput,
  isValidSaudiPhone,
  saudiPhoneHelperText,
} from "@/lib/phone/saudiPhone"

/**
 * Saudi mobile input with live validation (same rules as purchase checkout).
 */
export function SaudiMobilePhoneField({
  id,
  value,
  onChange,
  onBlur,
  error: externalError,
  required = false,
  disabled = false,
  className,
  inputClassName,
}) {
  const { t } = useTranslation()
  const [touched, setTouched] = useState(false)

  const liveError = useMemo(() => {
    if (!touched && !externalError) return null
    return contactPhoneFieldError(value, t, { required })
  }, [value, touched, externalError, required, t])

  const displayError = liveError || externalError
  const trimmed = String(value ?? "").trim()
  const showValid = touched && trimmed && isValidSaudiPhone(trimmed) && !displayError

  return (
    <div className={cn("space-y-1", className)}>
      <Input
        id={id}
        {...SAUDI_PHONE_INPUT_PROPS}
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => {
          setTouched(true)
          onChange(formatSaudiPhoneInput(e.target.value))
        }}
        onBlur={() => {
          setTouched(true)
          onBlur?.()
        }}
        aria-invalid={Boolean(displayError)}
        className={cn(
          displayError && "border-destructive",
          showValid && "border-primary/60",
          inputClassName,
        )}
      />
      {displayError ? (
        <p className="text-xs text-destructive" role="alert">
          {displayError}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{saudiPhoneHelperText(t)}</p>
      )}
    </div>
  )
}

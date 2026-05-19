/** Saudi IBAN: SA + 22 digits (24 characters). */
export const SAUDI_IBAN_REGEX = /^SA[0-9]{22}$/

export const SAUDI_IBAN_EXAMPLE = "SA0380000000608010167519"

export const SAUDI_IBAN_EXAMPLE_FORMATTED = "SA03 8000 0000 6080 1016 7519"

export function normalizeIban(value) {
  if (value == null || value === "") return ""
  return String(value).replace(/\s/g, "").toUpperCase()
}

export function isValidSaudiIban(value) {
  const iban = normalizeIban(value)
  return SAUDI_IBAN_REGEX.test(iban)
}

/** Groups IBAN as SAxx xxxx xxxx xxxx xxxx xxxx for display. */
export function formatIbanForDisplay(value) {
  const iban = normalizeIban(value)
  if (!iban) return ""
  const parts = [iban.slice(0, 4)]
  for (let i = 4; i < iban.length; i += 4) {
    parts.push(iban.slice(i, i + 4))
  }
  return parts.join(" ")
}

const FILE_FIELD_TYPES = new Set(["file", "upload", "image", "image_upload", "pdf", "pdf_upload"])

export function isFileFieldType(fieldType) {
  return FILE_FIELD_TYPES.has(fieldType)
}

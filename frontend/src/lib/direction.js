export function getDirection(language) {
  return String(language || "").toLowerCase().startsWith("ar") ? "rtl" : "ltr"
}

export function isRtlLanguage(language) {
  return getDirection(language) === "rtl"
}

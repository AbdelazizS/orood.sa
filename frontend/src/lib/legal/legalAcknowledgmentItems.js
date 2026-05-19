/** Shared legal acknowledgment keys (register + add listing). */
export const LEGAL_ACK_ITEM_KEYS = [
  "platformRole1",
  "platformRole4",
  "userOath1",
  "userOath2",
  "userOath3",
  "userOath4",
]

export function createEmptyOathChecks() {
  return Object.fromEntries(LEGAL_ACK_ITEM_KEYS.map((key) => [key, false]))
}

export function allOathChecksAccepted(checks) {
  return LEGAL_ACK_ITEM_KEYS.every((key) => Boolean(checks?.[key]))
}

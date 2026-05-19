/**
 * @param {string | null | undefined} accountKind
 * @param {(key: string, opts?: object) => string} t
 */
export function getAccountKindLabel(accountKind, t) {
  if (!accountKind) return null
  const key = `publicProfile.accountKind.${accountKind}`
  const label = t(key)
  return label === key ? null : label
}

/**
 * @param {{ account_kind?: string | null } | null | undefined} subject
 */
export function resolveAccountKind(subject) {
  const kind = subject?.account_kind
  return typeof kind === "string" && kind.trim() ? kind.trim() : null
}

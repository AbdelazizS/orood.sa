export function passwordMatchesPolicy(password, policy) {
  const minLength = Number(policy?.min_length ?? 6)
  if (!password || password.length < minLength) return false

  const requires = Array.isArray(policy?.requires) ? policy.requires : ["letter", "number"]
  if (requires.includes("letter") && !/[A-Za-z]/.test(password)) return false
  if (requires.includes("number") && !/\d/.test(password)) return false
  if (requires.includes("uppercase") && !/[A-Z]/.test(password)) return false
  if (requires.includes("lowercase") && !/[a-z]/.test(password)) return false
  if (requires.includes("special") && !/[^\w\s]/.test(password)) return false
  return true
}

export function isAroothComEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase()
    .endsWith("@arooth.com")
}

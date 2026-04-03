import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Check, X } from "lucide-react"

const RULES = [
  { key: "min", test: (p) => p.length >= 8, labelKey: "auth.passwordMin" },
  { key: "upper", test: (p) => /[A-Z]/.test(p), labelKey: "auth.passwordUpper" },
  { key: "lower", test: (p) => /[a-z]/.test(p), labelKey: "auth.passwordLower" },
  { key: "number", test: (p) => /\d/.test(p), labelKey: "auth.passwordNumber" },
  { key: "special", test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p), labelKey: "auth.passwordSpecial" },
]

export function PasswordStrengthMeter({ password, showRules = true, className }) {
  const { t } = useTranslation()

  const { score, rules } = useMemo(() => {
    const rules = RULES.map((r) => ({
      ...r,
      passed: r.test(password),
    }))
    const passed = rules.filter((r) => r.passed).length
    const score = Math.round((passed / rules.length) * 100)
    return { score, rules }
  }, [password])

  if (!password) return null

  return (
    <div className={cn("space-y-2", className)}>
      {/* Progress bar */}
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              (i + 1) * 20 <= score
                ? score >= 80
                  ? "bg-green-500"
                  : score >= 60
                    ? "bg-amber-500"
                    : "bg-amber-400"
                : "bg-muted"
            )}
          />
        ))}
      </div>
      {showRules && (
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {rules.map((r) => (
            <li
              key={r.key}
              className={cn(
                "flex items-center gap-2",
                r.passed ? "text-green-600 dark:text-green-500" : ""
              )}
            >
              {r.passed ? (
                <Check className="size-3.5 shrink-0" />
              ) : (
                <X className="size-3.5 shrink-0 opacity-50" />
              )}
              {t(r.labelKey)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

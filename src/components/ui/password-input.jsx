import * as React from "react"
import { useTranslation } from "react-i18next"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const PasswordInput = React.forwardRef(({ className, ...props }, ref) => {
  const { t } = useTranslation()
  const [show, setShow] = React.useState(false)
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        className={cn("pe-10", className)}
        ref={ref}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? t("auth.hidePassword", "Hide password") : t("auth.showPassword", "Show password")}
      >
        {show ? <EyeOff className="size-4 text-muted-foreground" /> : <Eye className="size-4 text-muted-foreground" />}
      </Button>
    </div>
  )
})
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }

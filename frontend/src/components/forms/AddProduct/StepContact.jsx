import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { MessageCircle, Phone } from "lucide-react"

export function StepContact({
  contactChat,
  contactPhone,
  phoneNumber,
  onChange,
  disabled,
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-5 text-muted-foreground" />
          <Label htmlFor="contactChat">{t("addOffer.contactMessages")}</Label>
        </div>
        <Switch
          id="contactChat"
          checked={contactChat}
          onCheckedChange={(v) => onChange({ contactChat: v })}
          disabled={disabled}
        />
      </div>
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="size-5 text-muted-foreground" />
            <Label htmlFor="contactPhone">{t("addOffer.contactPhone")}</Label>
          </div>
          <Switch
            id="contactPhone"
            checked={contactPhone}
            onCheckedChange={(v) => onChange({ contactPhone: v, phoneNumber: v ? phoneNumber : "" })}
            disabled={disabled}
          />
        </div>
        {contactPhone && (
          <div className="space-y-2 ps-7">
            <Label htmlFor="phoneNumber" className="text-muted-foreground">
              {t("addProduct.phoneNumber", "Phone number")}
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => onChange({ phoneNumber: e.target.value })}
              placeholder="+966 5XX XXX XXXX"
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  )
}

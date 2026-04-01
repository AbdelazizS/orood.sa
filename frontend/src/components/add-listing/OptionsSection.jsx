import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const OPTION_HELPERS = {
  freeShipping: "إرسال المنتج بدون رسوم شحن",
  freeReturnSameDay: "استرجاع مجاني خلال نفس اليوم",
  viewAtLocation: "العميل يمكنه معاينة المنتج في موقعه",
  showComments: "إظهار التعليقات للجميع",
  contactByCall: "التواصل عبر المكالمة الهاتفية",
  contactByMessage: "التواصل عبر رسائل المنصة",
  noPlatformFee: "لا توجد رسوم منصة حالياً",
}

export default function OptionsSection({ form }) {
  const contactByCall = form.watch("contactByCall")

  const options = [
    { name: "freeShipping", label: "شحن المنتج مجاني" },
    { name: "freeReturnSameDay", label: "إرجاع مجاني في نفس اليوم" },
    { name: "viewAtLocation", label: "عرض المنتج في موقع العميل" },
    { name: "showComments", label: "إظهار التعليقات للعامة" },
    {
      name: "contactByCall",
      label: "التواصل عبر مكالمة",
      hasExtra: true,
    },
    { name: "contactByMessage", label: "التواصل عبر الرسائل" },
    {
      name: "noPlatformFee",
      label: "لا توجد رسوم منصة للبائع أو المشتري في هذا الوقت",
      fullWidth: true,
      disabled: true,
    },
  ]

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((opt) => (
          <FormField
            key={opt.name}
            control={form.control}
            name={opt.name}
            render={({ field }) => (
              <FormItem className={cn(opt.fullWidth && "md:col-span-2")}>
                <div className="space-y-0">
                  {opt.disabled ? (
                    <div
                      className={cn(
                        "rounded-2xl border-2 border-border p-4 opacity-90",
                        "flex items-start gap-3"
                      )}
                    >
                      <div className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-primary bg-primary flex items-center justify-center text-primary-foreground">
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <div className="flex-1 text-right min-w-0">
                        <span className="text-sm font-medium text-muted-foreground">
                          {opt.label}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {OPTION_HELPERS[opt.name]}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => field.onChange(!field.value)}
                      className={cn(
                        "w-full text-right appearance-none block",
                        "cursor-pointer transition-all duration-200 rounded-2xl border-2",
                        "hover:border-primary/50 hover:shadow-md",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        "p-4",
                        field.value
                          ? "border-primary/50 bg-primary/5"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
                            field.value
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-input bg-background"
                          )}
                        >
                          {field.value && (
                            <Check size={12} strokeWidth={3} />
                          )}
                        </div>
                        <div className="flex-1 text-right min-w-0">
                          <span className="text-sm font-medium text-foreground">
                            {opt.label}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {OPTION_HELPERS[opt.name]}
                          </p>
                        </div>
                      </div>
                    </button>
                  )}
                  {opt.hasExtra && contactByCall && (
                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field: phoneField }) => (
                        <FormItem className="mt-3 pl-0">
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="05xxxxxxxx"
                              dir="ltr"
                              className="h-9 text-sm text-left border-2 rounded-xl"
                              maxLength={10}
                              {...phoneField}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </FormItem>
            )}
          />
        ))}
      </div>
    </div>
  )
}

import { cn } from "@/lib/utils"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export default function PriceField({ form }) {
  return (
    <div className="px-4 py-3 sm:px-6 lg:px-8">
      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">
                السعر المطلوب <span className="text-destructive">*</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1 shrink-0 items-end">
                <span className="text-sm text-muted-foreground font-medium">
                  ريال سعودي
                </span>
                <div className="flex items-center gap-1.5">
                  <FormField
                    control={form.control}
                    name="taxIncluded"
                    render={({ field: taxField }) => (
                      <div className="flex items-center gap-1">
                        <Label
                          htmlFor="tax"
                          className="text-xs text-muted-foreground cursor-pointer"
                        >
                          شامل الضريبة
                        </Label>
                        <Checkbox
                          id="tax"
                          checked={taxField.value}
                          onCheckedChange={taxField.onChange}
                        />
                      </div>
                    )}
                  />
                  <span className="text-xs text-muted-foreground">ان وجدت</span>
                </div>
              </div>

              <FormControl>
                <Input
                  type="number"
                  placeholder="10000"
                  min="0"
                  dir="ltr"
                  className={cn(
                    "flex-1 text-center border-2 rounded-2xl px-4 py-3",
                    "bg-background shadow-sm",
                    "focus-visible:ring-2 focus-visible:ring-primary/20 text-sm",
                    form.formState.errors.price
                      ? "border-destructive"
                      : "border-border"
                  )}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </FormControl>

              <span className="text-sm text-muted-foreground shrink-0">ريال</span>
            </div>
            <FormMessage className="text-right" />
          </FormItem>
        )}
      />
    </div>
  )
}

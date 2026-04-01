import { Info } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function DescriptionField({ form }) {
  return (
    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground">
                    <Info size={15} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" dir="rtl">
                  <p className="text-xs max-w-48">
                    اكتب وصفاً تفصيلياً: الحالة، المواصفات، سبب البيع، أي معلومات مهمة
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <FormLabel className="text-sm font-medium text-foreground">
              النص <span className="text-destructive">*</span>
            </FormLabel>
          </div>
          <FormControl>
            <Textarea
              placeholder="اكتب وصفاً تفصيلياً للإعلان..."
              dir="rtl"
              rows={6}
              className={cn(
                "border-2 rounded-2xl bg-background px-4 py-3",
                "shadow-sm resize-none focus-visible:ring-2 focus-visible:ring-primary/20",
                "text-sm placeholder:text-muted-foreground",
                form.formState.errors.description
                  ? "border-destructive"
                  : "border-border"
              )}
              {...field}
            />
          </FormControl>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {field.value?.length || 0}/5000
            </span>
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  )
}

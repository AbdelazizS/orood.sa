import { Info } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function TitleField({ form }) {
  return (
    <FormField
      control={form.control}
      name="title"
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
                    اكتب عنواناً واضحاً يصف المنتج أو الخدمة بدقة. مثال: سكوتر كهربائي جديد
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <FormLabel className="text-sm font-medium text-foreground">
              العنوان <span className="text-destructive">*</span>
            </FormLabel>
          </div>
          <FormControl>
            <Input
              placeholder="اكتب عنوان إعلانك هنا..."
              dir="rtl"
              className={cn(
                "border-2 rounded-2xl bg-background px-4 py-3 h-auto",
                "text-sm placeholder:text-muted-foreground",
                "focus-visible:ring-2 focus-visible:ring-primary/20",
                form.formState.errors.title
                  ? "border-destructive"
                  : "border-border"
              )}
              {...field}
            />
          </FormControl>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {field.value?.length || 0}/200
            </span>
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  )
}

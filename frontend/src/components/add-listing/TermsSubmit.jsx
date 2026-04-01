import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"

export default function TermsSubmit({
  termsAccepted,
  onTermsChange,
  isSubmitting,
  progress,
}) {
  return (
    <>
      <div className="px-4 pt-6 pb-2 sm:px-6 lg:px-8">
        <div className="flex items-start gap-2 justify-end">
          <p className="text-xs text-muted-foreground text-right leading-relaxed flex-1">
            بالنشر فإنك تقبل{" "}
            <button
              type="button"
              className="text-primary underline text-xs hover:no-underline"
            >
              شروط الاستخدام
            </button>{" "}
            و{" "}
            <button
              type="button"
              className="text-primary underline text-xs hover:no-underline"
            >
              سياسة الخصوصية
            </button>{" "}
            وتتعهد بصحة المعلومات المدخلة
          </p>
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={onTermsChange}
            className="mt-0.5 shrink-0"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border py-3 safe-area-pb">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          {isSubmitting && (
            <Progress value={progress} className="h-1 mb-2" />
          )}

          <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!termsAccepted || isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              {progress < 100 ? `جارٍ رفع الصور... ${progress}%` : "جارٍ نشر الإعلان..."}
            </span>
          ) : (
            "انشر إعلانك"
          )}
        </Button>
        </div>
      </div>
    </>
  )
}

import { useRef, useEffect } from "react"
import { Camera, ImageIcon, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

export default function ImageUploader({
  images,
  onChange,
  isUploading,
  progress,
}) {
  const fileInputRef = useRef(null)

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || [])
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).slice(2),
    }))
    onChange((prev) => [...prev, ...newImages].slice(0, 10))
    e.target.value = ""
  }

  const removeImage = (id) => {
    onChange((prev) => {
      const img = prev.find((i) => i.id === id)
      if (img?.preview) URL.revokeObjectURL(img.preview)
      return prev.filter((i) => i.id !== id)
    })
  }

  useEffect(() => {
    return () => images.forEach((i) => i?.preview && URL.revokeObjectURL(i.preview))
  }, [])

  return (
    <div className="px-4 py-3 sm:px-6 lg:px-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "w-full flex items-center justify-between",
            "border-2 border-dashed border-border rounded-2xl",
            "px-6 py-8 hover:border-primary/50 hover:bg-accent/50 transition-all",
            "cursor-pointer"
          )}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <ImageIcon size={18} />
            <span className="text-sm">حمل صور</span>
          </div>
          <Camera size={20} className="text-muted-foreground" />
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-border shrink-0"
              >
                <img
                  src={img.preview}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className={cn(
                    "absolute top-0.5 right-0.5",
                    "h-5 w-5 rounded-full",
                    "bg-destructive text-destructive-foreground",
                    "flex items-center justify-center",
                    "hover:opacity-90"
                  )}
                >
                  <X size={10} />
                </button>
              </div>
            ))}

            {images.length < 10 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "h-20 w-20 rounded-2xl border-2 border-dashed",
                  "border-border flex items-center justify-center",
                  "hover:border-primary/50 hover:bg-accent/50 transition-all shrink-0"
                )}
              >
                <Plus size={20} className="text-muted-foreground" />
              </button>
            )}
          </div>

          {isUploading && (
            <div className="space-y-1">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground text-right">
                جارٍ رفع الصور... {progress}%
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-right">
            {images.length}/10 صور
          </p>
        </div>
      )}
    </div>
  )
}

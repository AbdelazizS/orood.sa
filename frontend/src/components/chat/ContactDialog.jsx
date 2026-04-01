import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import apiClient from "@/lib/apiClient"
import { useTranslation } from "react-i18next"
import { MessageSquare, Loader2 } from "lucide-react"

export function ContactDialog({ productId, productTitle, trigger }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState("")

  const sendMutation = useMutation({
    mutationFn: () => apiClient.post("/messages", { product_id: productId, body }),
    onSuccess: () => {
      setOpen(false)
      setBody("")
      navigate("/dashboard/messages")
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!body.trim()) return
    sendMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="w-full">
            <MessageSquare className="me-2 size-4" />
            {t("feed.contactNow")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("feed.contactNow")}</DialogTitle>
          <DialogDescription>{productTitle}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your message..."
            rows={4}
            disabled={sendMutation.isPending}
          />
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sendMutation.isPending || !body.trim()}>
              {sendMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

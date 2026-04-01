import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export function AddListingButton() {
  return (
    <Button asChild className="rounded-full bg-primary px-6 text-primary-foreground shadow-sm transition hover:bg-primary/90">
      <Link to="/add">
        <PlusCircle className="me-2 size-4" />
        أضف عرض / طلب
      </Link>
    </Button>
  )
}

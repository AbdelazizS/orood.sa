import { cn } from "@/lib/utils"
import { PAGE_CONTAINER_CLASS } from "@/lib/pageLayout"

export function PageContainer({ className, children, as: Component = "div" }) {
  return <Component className={cn(PAGE_CONTAINER_CLASS, className)}>{children}</Component>
}

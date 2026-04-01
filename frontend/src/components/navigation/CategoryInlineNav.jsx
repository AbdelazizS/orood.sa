import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu"
import { useFiltersStore } from "@/store/useFiltersStore"

/**
 * CategoryInlineNav now leverages shadcn NavigationMenu so the first column remains compact
 * and inline, similar to major Saudi marketplaces.
 */
export function CategoryInlineNav({ categories = [] }) {
  const { categoryId, setCategory, setSubcategory } = useFiltersStore()

  return (
    <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
      <NavigationMenu orientation="vertical" className="w-full">
        <NavigationMenuList className="flex flex-wrap gap-2 text-sm font-medium">
          <NavigationMenuItem>
            <NavigationMenuLink
              className={`rounded-full px-3 py-1 transition ${
                categoryId === null ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"
              }`}
              onClick={() => {
                setCategory(null)
                setSubcategory(null)
              }}
            >
              الكل
            </NavigationMenuLink>
          </NavigationMenuItem>
          {categories.map((category) => (
            <NavigationMenuItem key={category.id}>
              <NavigationMenuLink
                className={`rounded-full px-3 py-1 transition ${
                  categoryId === category.id ? "bg-primary/10 text-primary" : "text-foreground hover:text-primary"
                }`}
                onClick={() => {
                  setCategory(category.id)
                  setSubcategory(null)
                }}
              >
                {category.name}
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  )
}

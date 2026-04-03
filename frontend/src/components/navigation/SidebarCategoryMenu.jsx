import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu"
import { useFiltersStore } from "@/store/useFiltersStore"

/**
 * SidebarCategoryMenu renders categories inline via shadcn NavigationMenu so column one
 * mirrors the compact pill navigation seen in large Saudi marketplaces.
 */
export function SidebarCategoryMenu({ categories = [] }) {
  const { categoryId, setCategory, setSubcategory } = useFiltersStore()

  return (
    <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
      <NavigationMenu orientation="vertical" className="w-full">
        <NavigationMenuList className="flex flex-wrap gap-2">
          <NavigationMenuItem>
            <NavigationMenuLink
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
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
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
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
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu"
import { useFiltersStore } from "@/store/useFiltersStore"

/**
 * SidebarCategoryMenu renders categories inline via shadcn NavigationMenu so the first column
 * mirrors the tight, pill-based navigation on big Saudi marketplaces.
 */
export function SidebarCategoryMenu({ categories = [] }) {
  const { categoryId, setCategory, setSubcategory } = useFiltersStore()

  return (
    <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
      <NavigationMenu orientation="vertical" className="w-full">
        <NavigationMenuList className="flex flex-wrap gap-2">
          <NavigationMenuItem>
            <NavigationMenuLink
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
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
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
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
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu"
import { useFiltersStore } from "@/store/useFiltersStore"

/**
 * SidebarCategoryMenu renders categories inline using shadcn NavigationMenu so it feels
 * like large Saudi marketplace navigation. Subcategory pills remain in column two.
 */
export function SidebarCategoryMenu({ categories = [] }) {
  const { categoryId, setCategory, setSubcategory } = useFiltersStore()

  return (
    <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
      <NavigationMenu orientation="vertical" className="w-full">
        <NavigationMenuList className="flex flex-wrap gap-2">
          <NavigationMenuItem>
            <NavigationMenuLink
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
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
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
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

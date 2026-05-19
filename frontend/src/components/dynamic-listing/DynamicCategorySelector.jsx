import { CategorySelector } from "@/components/add-listing/CategorySelector"

/** Wraps category selector; parent resets schema state on change. */
export function DynamicCategorySelector(props) {
  return <CategorySelector {...props} />
}

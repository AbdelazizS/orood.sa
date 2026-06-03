/**
 * Helpers for nested subcategory trees (admin + add-listing drill-down).
 */

export function subHasChildren(sub) {
  if (!sub) return false
  if (sub.has_children === true) return true
  return Array.isArray(sub.children) && sub.children.length > 0
}

export function getSubcategoriesAtLevel(roots, drillStack) {
  if (!roots?.length) return []
  let current = roots
  for (const node of drillStack) {
    const found = current.find((s) => String(s.id) === String(node.id))
    if (!found) return []
    current = found.children ?? []
  }
  return current
}

export function findSubcategoryPath(roots, targetId) {
  if (!targetId || !roots?.length) return []
  for (const node of roots) {
    if (String(node.id) === String(targetId)) return [node]
    if (node.children?.length) {
      const rest = findSubcategoryPath(node.children, targetId)
      if (rest.length) return [node, ...rest]
    }
  }
  return []
}

export function countSubcategories(nodes) {
  if (!nodes?.length) return 0
  return nodes.reduce((sum, n) => {
    const children = n.children ?? n.children_recursive ?? []
    return sum + 1 + countSubcategories(children)
  }, 0)
}

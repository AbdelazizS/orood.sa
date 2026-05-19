/**
 * Page layout tokens — align with SiteHeader / TopNavigation / Footer (max-w-7xl + gutters).
 * Hero bands bleed to the container edges; body copy is left/right aligned, not a centered narrow column.
 */
export const PAGE_MAX_WIDTH_CLASS = "max-w-7xl"
export const PAGE_GUTTER_CLASS = "px-4 sm:px-6"
export const PAGE_CONTAINER_CLASS = `mx-auto w-full ${PAGE_MAX_WIDTH_CLASS} ${PAGE_GUTTER_CLASS}`

/** Optional narrower measure for short hero copy (still text-start, no mx-auto) */
export const PAGE_PROSE_WIDTH_CLASS = "max-w-3xl"

/**
 * Hero background band inside AppLayout — negative margin cancels gutter so bg lines up with header edges.
 */
export const PAGE_HERO_BLEED_CLASS = `-mx-4 border-b border-border bg-muted/40 px-4 sm:-mx-6 sm:px-6`

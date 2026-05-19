/** Shared map picker chrome — /add, purchase, profile, PDP. */

export const MAP_HEIGHT_COMPACT = "h-[240px] min-h-[200px] max-h-[280px]"
export const MAP_HEIGHT_EXPANDED = "min-h-[min(45vh,360px)] max-h-[min(52vh,480px)]"

/** Fixed height for picker map canvas (search overlays on top). */
export const MAP_PICKER_MAP_CLASS = "relative h-[240px] w-full sm:h-[260px]"

export const MAP_PICKER_SHELL_CLASS = "map-picker-clean"

export const MAP_PICKER_SHELL_CLASS_LARGE =
  "map-picker-clean [&_.relative]:min-h-[min(45vh,360px)] [&_.relative]:max-h-[min(52vh,480px)]"

export const MAP_PICKER_EDIT_PROPS = {
  mapActive: true,
  hideMapAttribution: true,
  showSearch: true,
  showZoomControls: false,
  showLocateControl: true,
  showInlineHint: true,
  hintInFooter: true,
  shellVariant: "property",
}

export const MAP_PICKER_VIEW_PROPS = {
  mapActive: true,
  hideMapAttribution: true,
  readOnly: true,
  showSearch: false,
  showLocateControl: false,
  showZoomControls: true,
  showInlineHint: true,
  hintInFooter: true,
  shellVariant: "property",
}

export const MAP_SKELETON_CLASS =
  "min-h-[200px] max-h-[280px] sm:min-h-[240px] w-full animate-pulse rounded-xl border border-border bg-muted/40"

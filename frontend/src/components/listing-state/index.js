export { ListingStateBanner } from "./ListingStateBanner"
export { ListingActionButtons } from "./ListingActionButtons"

/** Pick primary CTA from seller_state for inline buttons. */
export function getPrimaryListingAction(sellerState) {
  const actions = sellerState?.available_actions ?? []
  return actions.find((a) => a.variant === "primary") ?? actions[0] ?? null
}

import { LegalAcknowledgmentList } from "@/components/legal/LegalAcknowledgmentList"

/**
 * Terms box for registration — merged legal list, always visible.
 */
export function TermsBox() {
  return <LegalAcknowledgmentList translationPrefix="auth" />
}

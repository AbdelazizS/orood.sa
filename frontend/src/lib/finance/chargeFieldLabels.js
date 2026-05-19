/** i18n keys for wallet charge dynamic field labels (fallback when API label missing). */
const CHARGE_FIELD_LABEL_KEYS = {
  amount: "common.amount",
  payer_bank_name: "dashboard.payerBankName",
  transfer_reference: "dashboard.transferReference",
  receipt_url: "dashboard.receiptUrl",
  note: "dashboard.chargeNote",
}

export function chargeFieldLabel(t, row) {
  const key = row?.field_key
  const apiLabel = row?.label
  if (apiLabel && apiLabel !== key) {
    return apiLabel
  }
  const i18nKey = CHARGE_FIELD_LABEL_KEYS[key]
  if (i18nKey) {
    return t(i18nKey)
  }
  return key ?? ""
}

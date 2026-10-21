import apiClient from "@/lib/apiClient"

/** Drop empty filter values so they are not sent as `?city_id=`. */
function cleanParams(params = {}) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== ""))
}

// ── Subscriber area (role: subscriber) ─────────────────────────────

export async function getSubscriberSummary() {
  const { data } = await apiClient.get("/subscriber/summary")
  return data?.data ?? {}
}

export async function getAvailableListings(filters) {
  const { data } = await apiClient.get("/subscriber/available", { params: cleanParams(filters) })
  return { items: data?.data ?? [], meta: data?.meta ?? {} }
}

export async function getAvailableMap(filters) {
  const { data } = await apiClient.get("/subscriber/available/map", { params: cleanParams(filters) })
  return Array.isArray(data?.data) ? data.data : []
}

export async function getSubscriberProduct(productId) {
  const { data } = await apiClient.get(`/subscriber/products/${productId}`)
  return { product: data?.data ?? null, meta: data?.meta ?? {} }
}

export async function buyListingAd(productId) {
  const { data } = await apiClient.post(`/subscriber/products/${productId}/buy`)
  return data?.data ?? {}
}

export async function getMySubscriberListings(filters) {
  const { data } = await apiClient.get("/subscriber/my-listings", { params: cleanParams(filters) })
  return { items: data?.data ?? [], meta: data?.meta ?? {} }
}

// ── Private follow-up notes (subscriber + staff) ───────────────────

export async function getFollowUpNotes(subscriberListingId) {
  const { data } = await apiClient.get(`/subscriber-listings/${subscriberListingId}/notes`)
  return data?.data ?? []
}

export async function addFollowUpNote(subscriberListingId, body) {
  const { data } = await apiClient.post(`/subscriber-listings/${subscriberListingId}/notes`, { body })
  return data?.data
}

// ── Admin ──────────────────────────────────────────────────────────

export async function adminListSubscribers(search) {
  const { data } = await apiClient.get("/admin/subscribers", { params: cleanParams({ search }) })
  return data?.data ?? []
}

export async function adminCreateSubscriber(payload) {
  const { data } = await apiClient.post("/admin/subscribers", payload)
  return data
}

export async function adminChangeSubscriberCredits(userId, delta, note, amountSar) {
  const { data } = await apiClient.post(`/admin/subscribers/${userId}/credits`, {
    delta,
    note: note || undefined,
    amount_sar: amountSar || undefined,
  })
  return data?.data ?? {}
}

export async function adminListSubscriberListings(filters) {
  const { data } = await apiClient.get("/admin/subscriber-listings", { params: cleanParams(filters) })
  return { items: data?.data ?? [], meta: data?.meta ?? {} }
}

// ── Subscriber dashboard ───────────────────────────────────────────

export async function getSubscriberOverview() {
  const { data } = await apiClient.get("/subscriber/overview")
  return data?.data ?? {}
}

export async function getSubscriberCredits() {
  const { data } = await apiClient.get("/subscriber/credits")
  return data?.data ?? { balance: 0, ledger: [], requests: [] }
}

export async function requestSubscriberCredits(quantity, note, amountSar) {
  const { data } = await apiClient.post("/subscriber/credit-requests", {
    quantity,
    note: note || undefined,
    amount_sar: amountSar || undefined,
  })
  return data?.data
}

/** Opens (or reuses) the direct conversation with the Arooth team. */
export async function openSupportConversation() {
  const { data } = await apiClient.post("/subscriber/support-conversation")
  return data?.data?.conversation_id
}

export async function getSubscriberAccount() {
  const { data } = await apiClient.get("/subscriber/account")
  return data?.data ?? {}
}

export async function updateSubscriberAccount(payload) {
  const { data } = await apiClient.put("/subscriber/account", payload)
  return data?.data ?? {}
}

// ── Admin: credit requests ─────────────────────────────────────────

export async function adminListCreditRequests(status) {
  const { data } = await apiClient.get("/admin/subscriber-credit-requests", { params: cleanParams({ status }) })
  return { items: data?.data ?? [], pendingCount: data?.meta?.pending_count ?? 0 }
}

export async function adminApproveCreditRequest(id, quantity, adminNote, amountSar) {
  const { data } = await apiClient.post(`/admin/subscriber-credit-requests/${id}/approve`, {
    quantity: quantity || undefined,
    amount_sar: amountSar || undefined,
    admin_note: adminNote || undefined,
  })
  return data?.data
}

export async function adminRejectCreditRequest(id, adminNote) {
  const { data } = await apiClient.post(`/admin/subscriber-credit-requests/${id}/reject`, { admin_note: adminNote || undefined })
  return data?.data
}

// ── Ad lifecycle (sold / cancelled at the owner's request) ─────────

export async function markSubscriberListingSold(subscriberListingId) {
  const { data } = await apiClient.post(`/subscriber/listings/${subscriberListingId}/sold`)
  return data?.data
}

export async function adminMarkSubscriberListingSold(subscriberListingId) {
  const { data } = await apiClient.post(`/admin/subscriber-listings/${subscriberListingId}/sold`)
  return data?.data
}

export async function adminCancelSubscriberListing(subscriberListingId, refund, reason) {
  const { data } = await apiClient.post(`/admin/subscriber-listings/${subscriberListingId}/cancel`, { refund, reason: reason || undefined })
  return data?.data
}

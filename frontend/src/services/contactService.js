import apiClient from "@/lib/apiClient"

export async function fetchContactPage(language) {
  const { data } = await apiClient.get("/contact/page", {
    headers: {
      "Accept-Language": language?.startsWith("en") ? "en" : "ar",
    },
  })
  return data?.data ?? {}
}

export async function submitContactInquiry(payload) {
  const isFormData = payload instanceof FormData
  const { data } = await apiClient.post("/contact", payload, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
  })
  return data
}

import apiClient from "@/lib/apiClient"

// ── Public channel ─────────────────────────────────────────────────

export async function getCompanyVideos(companyId, { type, page = 1, perPage = 24 } = {}) {
  const { data } = await apiClient.get(`/companies/${companyId}/videos`, {
    params: { type: type || undefined, page, per_page: perPage },
  })
  return { items: data?.data ?? [], meta: data?.meta ?? {} }
}

export async function getVideo(videoId) {
  const { data } = await apiClient.get(`/videos/${videoId}`)
  return { video: data?.data ?? null, upNext: data?.meta?.up_next ?? [] }
}

export async function recordVideoView(videoId) {
  const { data } = await apiClient.post(`/videos/${videoId}/view`)
  return data?.data
}

export async function toggleVideoLike(videoId) {
  const { data } = await apiClient.post(`/videos/${videoId}/like`)
  return data?.data
}

// ── Comments ───────────────────────────────────────────────────────

export async function getVideoComments(videoId, { sort = "top", page = 1 } = {}) {
  const { data } = await apiClient.get(`/videos/${videoId}/comments`, { params: { sort, page } })
  return { items: data?.data ?? [], meta: data?.meta ?? {} }
}

export async function addVideoComment(videoId, { body, parentId, timestampSec }) {
  const { data } = await apiClient.post(`/videos/${videoId}/comments`, {
    body,
    parent_id: parentId ?? undefined,
    timestamp_sec: timestampSec ?? undefined,
  })
  return data?.data
}

export async function deleteVideoComment(commentId) {
  await apiClient.delete(`/video-comments/${commentId}`)
}

export async function toggleVideoCommentLike(commentId) {
  const { data } = await apiClient.post(`/video-comments/${commentId}/like`)
  return data?.data
}

/** Channel-owner tools: "pin" | "heart" | "hide". */
export async function moderateVideoComment(commentId, action) {
  const { data } = await apiClient.post(`/video-comments/${commentId}/${action}`)
  return data?.data
}

// ── Company's own channel ──────────────────────────────────────────

export async function getMyCompanyVideos() {
  const { data } = await apiClient.get("/company/videos")
  return { items: data?.data ?? [], meta: data?.meta ?? {} }
}

/**
 * @param {FormData} formData video, thumbnail?, title, description?, is_short?, duration_sec?, product_id?
 * @param {(percent: number) => void} [onProgress]
 */
export async function uploadCompanyVideo(formData, onProgress) {
  const { data } = await apiClient.post("/company/videos", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 0,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  return data?.data
}

export async function updateCompanyVideo(videoId, payload) {
  const { data } = await apiClient.put(`/company/videos/${videoId}`, payload)
  return data?.data
}

export async function deleteCompanyVideo(videoId) {
  await apiClient.delete(`/company/videos/${videoId}`)
}

export async function updateCompanyActivities(activities, description, falLicenseNo) {
  const { data } = await apiClient.put("/company/activities", { activities, description, fal_license_no: falLicenseNo })
  return data?.data
}

// ── Admin moderation ───────────────────────────────────────────────

export async function adminListCompanyVideos({ search, status, page = 1 } = {}) {
  const { data } = await apiClient.get("/admin/company-videos", {
    params: { search: search || undefined, status: status || undefined, page },
  })
  return { items: data?.data ?? [], meta: data?.meta ?? {} }
}

export async function adminSetCompanyVideoStatus(videoId, status, reason) {
  const { data } = await apiClient.patch(`/admin/company-videos/${videoId}/status`, { status, reason: reason || undefined })
  return data?.data
}

// ── A listing's own video (any section, any owner) ──────────────────

export async function getMyListingVideos(productId) {
  const { data } = await apiClient.get(`/products/${productId}/my-videos`)
  return { items: data?.data ?? [], meta: data?.meta ?? {} }
}

/** @param {FormData} formData video, thumbnail?, duration_sec? */
export async function uploadListingVideo(productId, formData, onProgress) {
  const { data } = await apiClient.post(`/products/${productId}/videos`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 0,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  return data?.data
}

export async function deleteListingVideo(productId, videoId) {
  await apiClient.delete(`/products/${productId}/videos/${videoId}`)
}

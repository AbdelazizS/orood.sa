import axios from "axios"

/** @deprecated Legacy string from apiClient before structured errors */
const LEGACY_TIMEOUT_MSG = "Request timeout - server may be slow"

/**
 * User-facing description for public profile load failures (i18n via `t`).
 */
export function getProfileLoadErrorDescription(error, t) {
  if (!error) return t("profile.error_message")

  if (error.code === "TIMEOUT" || error.isApiTimeout === true) {
    return t("profile.errors.requestTimeout")
  }
  if (typeof error.message === "string" && error.message === LEGACY_TIMEOUT_MSG) {
    return t("profile.errors.requestTimeout")
  }

  if (axios.isAxiosError(error) && !error.response) {
    return t("profile.errors.networkUnreachable")
  }

  if (error.code === "NOT_FOUND" || error.message === "User not found") {
    return t("profile.user_not_exist")
  }

  const apiMsg = error.response?.data?.message
  if (typeof apiMsg === "string" && apiMsg.trim()) return apiMsg

  if (typeof error.message === "string" && error.message.trim() && error.message !== LEGACY_TIMEOUT_MSG) {
    return error.message
  }

  return t("profile.error_message")
}

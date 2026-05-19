/** Stable key for profile fields — skip form reset when server data unchanged. */
export function profileFieldsKey(profile) {
  if (!profile) return ""
  const cityId = profile.city_id ?? profile.city?.id ?? ""
  return [
    profile.id ?? "",
    profile.name ?? "",
    profile.bio ?? "",
    cityId,
    profile.location_lat ?? "",
    profile.location_lng ?? "",
    profile.location_address ?? "",
  ].join("|")
}

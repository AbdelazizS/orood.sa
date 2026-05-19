/**
 * Merge PUT /profile payload into public profile query cache `user` object.
 */
export function mergeProfileCacheUser(previousUser, variables, responseUser) {
  if (!previousUser) return previousUser

  const resCity = responseUser?.city
  const cityName =
    typeof resCity === "string"
      ? resCity
      : resCity && typeof resCity === "object" && resCity.name
        ? resCity.name
        : previousUser.city

  const resRegion = responseUser?.city?.region ?? responseUser?.region
  const regionName =
    typeof resRegion === "string"
      ? resRegion
      : resRegion && typeof resRegion === "object" && resRegion.name
        ? resRegion.name
        : previousUser.region

  return {
    ...previousUser,
    name: variables.name ?? previousUser.name,
    bio: variables.bio !== undefined ? variables.bio : previousUser.bio,
    city_id: variables.city_id !== undefined ? variables.city_id : previousUser.city_id,
    city: cityName,
    region: regionName,
    location_lat:
      variables.location_lat !== undefined ? variables.location_lat : previousUser.location_lat,
    location_lng:
      variables.location_lng !== undefined ? variables.location_lng : previousUser.location_lng,
    location_address:
      variables.location_address !== undefined
        ? variables.location_address
        : previousUser.location_address,
  }
}

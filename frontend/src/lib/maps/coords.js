export function isValidLatLng(lat, lng) {
  const la = Number(lat)
  const ln = Number(lng)
  return Number.isFinite(la) && Number.isFinite(ln) && la >= -90 && la <= 90 && ln >= -180 && ln <= 180
}

export function clampCoords(lat, lng) {
  const la = Math.min(90, Math.max(-90, Number(lat)))
  let ln = Number(lng)
  while (ln > 180) ln -= 360
  while (ln < -180) ln += 360
  return { lat: la, lng: ln }
}

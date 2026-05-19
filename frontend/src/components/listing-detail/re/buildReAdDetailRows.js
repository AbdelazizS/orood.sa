import { realEstatePurposeLabel } from "@/lib/realEstate/labels"

/**
 * @param {object} product
 * @param {function} t
 * @returns {{ key: string, label: string, value: string }[]}
 */
export function buildReAdDetailRows(product, t) {
  const re = product?.real_estate
  if (!re) return []

  const rows = []

  if (re.street_width_m != null && re.street_width_m !== "") {
    rows.push({
      key: "street_width",
      label: t("listingDetail.re.streetWidth", "عرض الشارع"),
      value: `${re.street_width_m} ${t("listingDetail.re.meter", "م")}`,
    })
  }

  let areaValue = null
  if (re.property_type === "land" && re.land_width_m && re.land_length_m) {
    areaValue = `${re.land_width_m} × ${re.land_length_m} ${t("listingDetail.re.meter", "م")}`
  } else if (re.area_sqm != null) {
    areaValue = `${re.area_sqm} ${t("listingDetail.re.sqm", "م²")}`
  }
  if (areaValue) {
    rows.push({
      key: "area",
      label: t("realEstate.areaLabel", "المساحة"),
      value: areaValue,
    })
  }

  const categoryLabel =
    product?.subcategory?.name ??
    (re.purpose ? realEstatePurposeLabel(re.purpose, t) : null)
  if (categoryLabel) {
    rows.push({
      key: "category",
      label: t("listingDetail.re.category", "الفئة"),
      value: categoryLabel,
    })
  }

  if (re.bedrooms != null && re.property_type !== "land") {
    rows.push({
      key: "bedrooms",
      label: t("realEstate.bedrooms", "غرف النوم"),
      value: String(re.bedrooms),
    })
  }

  if (re.bathrooms != null && re.property_type !== "land") {
    rows.push({
      key: "bathrooms",
      label: t("listingDetail.re.bathrooms", "دورات المياه"),
      value: String(re.bathrooms),
    })
  }

  if (re.floor_number != null && ["apartment", "floor", "building"].includes(re.property_type)) {
    const floorVal =
      Number(re.floor_number) <= 1
        ? t("listingDetail.re.groundFloor", "أرضي")
        : String(re.floor_number)
    rows.push({
      key: "floor",
      label: t("listingDetail.re.floor", "الدور"),
      value: floorVal,
    })
  }

  if (re.property_type !== "land" && re.property_type !== "farm") {
    const ageVal =
      re.property_age_years == null || Number(re.property_age_years) === 0
        ? t("listingDetail.re.newProperty", "جديد")
        : t("listingDetail.re.yearsOld", {
            count: re.property_age_years,
            defaultValue: "{{count}} سنة",
          })
    rows.push({
      key: "age",
      label: t("listingDetail.re.propertyAge", "عمر العقار"),
      value: ageVal,
    })
  }

  return rows
}

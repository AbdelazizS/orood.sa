import { CompanyLocationMap } from "@/components/maps/CompanyLocationMap.jsx"

export function WholesaleCompanyMapSection({ company, dir = "rtl" }) {
  const viewOnMapHref = company?.city
    ? `/map?city=${encodeURIComponent(company.city)}`
    : "/map"

  return <CompanyLocationMap company={company} dir={dir} viewOnMapHref={viewOnMapHref} />
}

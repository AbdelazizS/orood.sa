import { create } from "zustand"

const DEFAULT_STATE = {
  categoryId: null,
  subcategoryId: null,
  regionId: null,
  cityId: null,
  activeFilter: "all",
  listingType: null,
  searchQuery: "",
  rePurpose: null,
  rePropertyType: null,
  reMinArea: "",
  reMaxArea: "",
  reBedroomsMin: "",
  district: null,
  minPrice: "",
  maxPrice: "",
  streetWidthMin: null,
}

const MAP_FILTER_DEFAULTS = {
  regionId: null,
  cityId: null,
  rePropertyType: null,
  district: null,
  minPrice: "",
  maxPrice: "",
  streetWidthMin: null,
}

export const useFiltersStore = create((set) => ({
  ...DEFAULT_STATE,
  setCategory: (categoryId) =>
    set(() => ({
      categoryId,
      subcategoryId: null,
      rePurpose: null,
      rePropertyType: null,
      reMinArea: "",
      reMaxArea: "",
      reBedroomsMin: "",
    })),
  setSubcategory: (subcategoryId) => set({ subcategoryId }),
  setRegion: (regionId) =>
    set((state) => ({
      regionId,
      cityId: regionId === state.regionId ? state.cityId : null,
    })),
  setCity: (cityId) =>
    set((state) => ({ cityId, district: cityId === state.cityId ? state.district : null })),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  setListingType: (listingType) => set({ listingType }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setRePurpose: (rePurpose) => set({ rePurpose }),
  setRePropertyType: (rePropertyType) => set({ rePropertyType }),
  setReMinArea: (reMinArea) => set({ reMinArea }),
  setReMaxArea: (reMaxArea) => set({ reMaxArea }),
  setReBedroomsMin: (reBedroomsMin) => set({ reBedroomsMin }),
  setDistrict: (district) => set({ district: district || null }),
  setMinPrice: (minPrice) => set({ minPrice }),
  setMaxPrice: (maxPrice) => set({ maxPrice }),
  setStreetWidthMin: (streetWidthMin) => set({ streetWidthMin }),
  /** Apply the map search panel in one update (avoids one refetch per field). */
  setMapFilters: (filters) => set((state) => ({ ...state, ...filters })),
  resetMapFilters: () => set(MAP_FILTER_DEFAULTS),
  resetFilters: () => set(DEFAULT_STATE),
}))

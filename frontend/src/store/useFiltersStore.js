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
  setCity: (cityId) => set({ cityId }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  setListingType: (listingType) => set({ listingType }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setRePurpose: (rePurpose) => set({ rePurpose }),
  setRePropertyType: (rePropertyType) => set({ rePropertyType }),
  setReMinArea: (reMinArea) => set({ reMinArea }),
  setReMaxArea: (reMaxArea) => set({ reMaxArea }),
  setReBedroomsMin: (reBedroomsMin) => set({ reBedroomsMin }),
  resetFilters: () => set(DEFAULT_STATE),
}))

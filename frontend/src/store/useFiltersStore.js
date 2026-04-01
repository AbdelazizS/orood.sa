import { create } from "zustand"

const DEFAULT_STATE = {
  categoryId: null,
  subcategoryId: null,
  regionId: null,
  cityId: null,
  activeFilter: "all",
  searchQuery: "",
}

export const useFiltersStore = create((set) => ({
  ...DEFAULT_STATE,
  setCategory: (categoryId) =>
    set(() => ({
      categoryId,
      subcategoryId: null,
    })),
  setSubcategory: (subcategoryId) => set({ subcategoryId }),
  setRegion: (regionId) =>
    set((state) => ({
      regionId,
      cityId: regionId === state.regionId ? state.cityId : null,
    })),
  setCity: (cityId) => set({ cityId }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  resetFilters: () => set(DEFAULT_STATE),
}))

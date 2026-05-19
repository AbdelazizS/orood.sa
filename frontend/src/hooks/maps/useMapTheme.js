import { useMemo } from "react"
import { useTheme } from "@/providers/ThemeProvider"
import { getRasterTiles } from "@/lib/maps/theme"

export function useMapRasterTiles() {
  const { theme } = useTheme()
  return useMemo(() => getRasterTiles(theme === "dark"), [theme])
}

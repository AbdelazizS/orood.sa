import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { DirectionProvider as RadixDirectionProvider } from "@radix-ui/react-direction"
import i18n from "@/lib/i18n"

const DirectionContext = createContext({ direction: "rtl" })

export function AppDirectionProvider({ children }) {
  const [direction, setDirection] = useState(() =>
    (typeof i18n.dir === "function" ? i18n.dir(i18n.language) : null) ?? (i18n.language === "ar" ? "rtl" : "ltr")
  )

  useEffect(() => {
    const handleChange = () => {
      const dir = (typeof i18n.dir === "function" ? i18n.dir(i18n.language) : null) ?? (i18n.language === "ar" ? "rtl" : "ltr")
      setDirection(dir)
    }
    handleChange()
    i18n.on("languageChanged", handleChange)
    return () => i18n.off("languageChanged", handleChange)
  }, [])

  // Portaled sheets/dialogs inherit <html dir>; keep it aligned with app language/direction.
  useEffect(() => {
    document.documentElement.dir = direction
    const lang =
      typeof i18n.language === "string" && i18n.language.length > 0
        ? i18n.language.split("-")[0]
        : direction === "rtl"
          ? "ar"
          : "en"
    document.documentElement.lang = lang
  }, [direction])

  const value = useMemo(() => ({ direction }), [direction])

  return (
    <DirectionContext.Provider value={value}>
      <RadixDirectionProvider dir={direction}>{children}</RadixDirectionProvider>
    </DirectionContext.Provider>
  )
}

export function useAppDirection() {
  return useContext(DirectionContext)
}

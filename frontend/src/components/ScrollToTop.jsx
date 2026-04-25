import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"

export function ScrollToTop() {
  const location = useLocation()
  const previousRef = useRef({
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
  })

  useEffect(() => {
    const previous = previousRef.current
    const hashOnlyChange =
      previous.pathname === location.pathname &&
      previous.search === location.search &&
      previous.hash !== location.hash

    if (!hashOnlyChange) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    }

    previousRef.current = {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    }
  }, [location.pathname, location.search, location.hash])

  return null
}

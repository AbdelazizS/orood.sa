import { Navigate, useParams } from "react-router-dom"

/** Legacy /category/:slug URLs → homepage with category filter only. */
export function CategoryHomeRedirect() {
  const { slug } = useParams()
  const target = slug ? `/?cat=${encodeURIComponent(slug)}` : "/"
  return <Navigate to={target} replace />
}

import { Navigate } from "react-router-dom"

/** Legacy route — schema builder lives under Categories. */
export function AdminCategorySchemasPage() {
  return <Navigate to="/admin/categories" replace />
}

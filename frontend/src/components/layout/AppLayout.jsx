/** Shared max-width for header, content, cards — uniform layout */
export function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col">
        {children}
      </div>
    </div>
  )
}

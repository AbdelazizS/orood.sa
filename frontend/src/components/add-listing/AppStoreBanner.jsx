/**
 * App store download badges — placeholder dark rounded rectangles.
 */
export function AppStoreBanner() {
  return (
    <div className="flex flex-wrap justify-center gap-2 py-4" dir="ltr">
      <a
        href="#"
        className="flex h-11 min-w-[100px] flex-1 items-center justify-center rounded-lg px-3 text-[10px] font-medium text-white"
        style={{ background: "#333", maxWidth: "33%" }}
      >
        EXPLORE IT ON
      </a>
      <a
        href="#"
        className="flex h-11 min-w-[100px] flex-1 items-center justify-center rounded-lg px-3 text-[10px] font-medium text-white"
        style={{ background: "#333", maxWidth: "33%" }}
      >
        GET IT ON
      </a>
      <a
        href="#"
        className="flex h-11 min-w-[100px] flex-1 items-center justify-center rounded-lg px-3 text-[10px] font-medium text-white"
        style={{ background: "#333", maxWidth: "33%" }}
      >
        Download on the
      </a>
    </div>
  )
}

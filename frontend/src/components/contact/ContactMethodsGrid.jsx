import { ContactMethodCard } from "./ContactMethodCard"

export function ContactMethodsGrid({ channels }) {
  if (!channels?.length) return null

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <ContactMethodCard key={channel.id || `${channel.type}-${channel.value}`} channel={channel} />
        ))}
      </div>
    </section>
  )
}

export default function CollectionLoading() {
  return (
    <div className="p-4 lg:p-8 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-white/5 rounded-lg" />
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[...Array(18)].map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-white/5 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

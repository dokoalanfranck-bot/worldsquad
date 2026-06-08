export default function BattlesLoading() {
  return (
    <div className="p-4 lg:p-8 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 bg-white/5 rounded-lg" />
        <div className="h-10 w-36 bg-white/5 rounded-xl" />
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-xl p-4 h-20 bg-white/3" />
        ))}
      </div>
    </div>
  )
}

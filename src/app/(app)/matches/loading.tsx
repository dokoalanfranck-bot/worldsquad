export default function MatchesLoading() {
  return (
    <div className="p-4 lg:p-8 space-y-4 animate-pulse">
      <div className="h-8 w-40 bg-white/5 rounded-lg" />
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-white/5 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-16 bg-white/5 rounded-lg" />
                <div className="h-5 w-8 bg-white/5 rounded" />
                <div className="h-10 w-16 bg-white/5 rounded-lg" />
              </div>
              <div className="h-8 w-24 bg-white/5 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

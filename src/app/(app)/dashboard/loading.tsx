export default function DashboardLoading() {
  return (
    <div className="p-4 lg:p-8 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-white/5 rounded-lg" />
          <div className="h-4 w-32 bg-white/5 rounded" />
        </div>
        <div className="h-10 w-24 bg-white/5 rounded-xl" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass rounded-xl p-4 space-y-2">
            <div className="h-3 w-16 bg-white/5 rounded" />
            <div className="h-7 w-20 bg-white/5 rounded" />
          </div>
        ))}
      </div>

      {/* Next match card */}
      <div className="glass rounded-xl p-6">
        <div className="h-4 w-32 bg-white/5 rounded mb-4" />
        <div className="flex items-center justify-between">
          <div className="h-12 w-24 bg-white/5 rounded-lg" />
          <div className="h-8 w-16 bg-white/5 rounded" />
          <div className="h-12 w-24 bg-white/5 rounded-lg" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-xl p-4 h-20 bg-white/3" />
        ))}
      </div>
    </div>
  )
}

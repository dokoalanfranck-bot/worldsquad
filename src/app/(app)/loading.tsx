export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#F5C518] animate-spin" />
        <p className="text-white/30 text-sm font-medium tracking-wider">CHARGEMENT</p>
      </div>
    </div>
  )
}

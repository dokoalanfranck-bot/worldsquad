export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>
}) {
  const { msg } = await searchParams
  const message = msg ?? 'Maintenance en cours, revenez bientôt !'

  return (
    <div className="min-h-screen bg-[#07070f] flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="w-20 h-20 rounded-3xl bg-yellow-500/10 flex items-center justify-center text-4xl">
        🔧
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          MAINTENANCE
        </h1>
        <p className="text-white/50 text-sm max-w-xs">{message}</p>
      </div>
      <p className="text-white/20 text-xs">WorldSquad — revenez dans quelques instants</p>
    </div>
  )
}

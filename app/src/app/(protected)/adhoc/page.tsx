import { Package } from "lucide-react"

export default function AdHocPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
        <Package size={28} className="text-gray-400" />
      </div>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Ad Hoc Deliveries</h1>
      <p className="text-sm text-gray-400 max-w-sm">
        This section is coming soon. Ad hoc delivery tracking will be available in a future release.
      </p>
    </div>
  )
}

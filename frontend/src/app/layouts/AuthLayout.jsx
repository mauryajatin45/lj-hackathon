import { ShieldCheckIcon } from 'lucide-react'

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center bg-gradient-to-b from-primary-50 to-white">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl">
                <ShieldCheckIcon className="w-8 h-8 text-primary-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sentinel</h1>
            <p className="text-gray-600">Content Security Dashboard</p>
          </div>
          
          {/* Content */}
          <div className="px-8 pb-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
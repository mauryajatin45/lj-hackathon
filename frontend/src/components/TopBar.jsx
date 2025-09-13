import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { useAuth } from '../context/AuthContext.jsx'
import { 
  UserCircleIcon, 
  ArrowRightOnRectangleIcon,
  ChevronDownIcon 
} from 'lucide-react'

export default function TopBar() {
  const { user, logout } = useAuth()

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sentinel</h1>
          <p className="text-sm text-gray-500">Content Security Dashboard</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* User Menu */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
              <UserCircleIcon className="w-5 h-5 text-gray-400" />
              <span className="hidden sm:block">{user?.email}</span>
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">Signed in as</p>
                  <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={logout}
                        className={`${
                          active ? 'bg-gray-50' : ''
                        } flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700`}
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  )
}
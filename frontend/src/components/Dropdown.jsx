import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'

export default function Dropdown({ 
  trigger, 
  children, 
  align = 'left'
}) {
  const alignmentClasses = {
    left: 'left-0 origin-top-left',
    right: 'right-0 origin-top-right',
    center: 'left-1/2 transform -translate-x-1/2 origin-top'
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button as="div">
        {trigger}
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
        <Menu.Items className={`absolute z-10 mt-2 w-64 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${alignmentClasses[align]}`}>
          <div className="py-1">
            {children}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
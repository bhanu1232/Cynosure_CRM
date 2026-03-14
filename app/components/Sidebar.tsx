'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    HomeIcon,
    IdentificationIcon,
    CalendarIcon,
    UserPlusIcon,
    Cog6ToothIcon
} from '@heroicons/react/24/outline';

const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Verification', href: '/registrations', icon: Cog6ToothIcon },
    { name: 'Success Registrations', href: '/success-registrations', icon: IdentificationIcon },
    { name: 'Issue Pass', href: '/issue-pass', icon: IdentificationIcon },
    { name: 'Failed Registrations', href: '/failed-registrations', icon: IdentificationIcon },
    { name: 'Spot Registration', href: '/add-participantbhanu123', icon: UserPlusIcon },
    { name: 'Events', href: '/events', icon: CalendarIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
    { name: 'Contributer', href: '/developer', icon: Cog6ToothIcon },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="hidden md:flex md:w-64 md:flex-col">
            <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto">
                <div className="flex items-center flex-shrink-0 px-4">
                    <span className="text-2xl font-bold text-gray-900">EMS</span>
                </div>
                <div className="mt-5 flex-grow flex flex-col">
                    <nav className="flex-1 px-2 space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`${isActive
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                                >
                                    <item.icon
                                        className={`${isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                                            } mr-3 flex-shrink-0 h-6 w-6`}
                                        aria-hidden="true"
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </div>
    );
} 
'use client';

import Sidebar from './Sidebar';
import { ToastContainer } from 'react-toastify';
import ProtectedRoute from './ProtectedRoute';
import 'react-toastify/dist/ReactToastify.css';
import { usePathname } from 'next/navigation';

// Routes that bypass auth and sidebar entirely
const PUBLIC_ROUTES = ['/live'];

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));

    // Public routes: render children directly without any auth or sidebar
    if (isPublicRoute) {
        return (
            <>
                {children}
                <ToastContainer position="top-right" autoClose={3000} />
            </>
        );
    }

    return (
        <>
            <ProtectedRoute>
                <div className="flex h-screen bg-gray-100">
                    <Sidebar />
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                            {children}
                        </main>
                    </div>
                </div>
            </ProtectedRoute>
            <ToastContainer position="top-right" autoClose={3000} />
        </>
    );
}
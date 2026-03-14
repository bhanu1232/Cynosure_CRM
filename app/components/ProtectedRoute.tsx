'use client';

import { useEffect, useState } from 'react';

// Hardcoded passkey for portal access
const ADMIN_PASSKEY = "CYNO_ADMIN_789456123";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [passkeyInput, setPasskeyInput] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // Check if passkey is saved in local storage
        const savedPasskey = localStorage.getItem('admin_passkey');
        if (savedPasskey === ADMIN_PASSKEY) {
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (passkeyInput === ADMIN_PASSKEY) {
            localStorage.setItem('admin_passkey', ADMIN_PASSKEY);
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Invalid passkey. Access denied.');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Checking access...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-6">
                            Admin Access Required
                        </h2>
                        <div className="mb-6">
                            <img src="/bms-logo.png" alt="BMS Logo" className="h-20 mx-auto" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        </div>
                        <p className="text-gray-600 mb-8">
                            Please enter the administrator passkey to continue.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={passkeyInput}
                                onChange={(e) => setPasskeyInput(e.target.value)}
                                placeholder="Enter Passkey"
                                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 text-black focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                required
                            />
                        </div>
                        
                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Access Dashboard
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div>
            {children}
        </div>
    );
}
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';

interface FailedRegistration {
    id: string;
    name: string;
    email: string;
    mobile: string;
    selectedEvents: string[];
    verifiedAt: string;
    status: string;
    rejectionReason?: string;
    paymentId: string;
    totalAmount: number;
    date: string;
    createdAt: string;
}

export default function FailedRegistrationsPage() {
    const [registrations, setRegistrations] = useState<FailedRegistration[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [allRegistrations, setAllRegistrations] = useState<FailedRegistration[]>([]);

    useEffect(() => {
        fetchFailedRegistrations();
    }, []);

    useEffect(() => {
        // Filter registrations based on search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const filtered = allRegistrations.filter(registration =>
                registration.email.toLowerCase().includes(query) ||
                registration.mobile.toLowerCase().includes(query)
            );
            setRegistrations(filtered);
        } else {
            setRegistrations(allRegistrations);
        }
    }, [searchQuery, allRegistrations]);

    const fetchFailedRegistrations = async () => {
        setLoading(true);
        try {
            const registrationsSnapshot = await getDocs(collection(db, 'failedRegistrations'));
            const registrationsData = registrationsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as FailedRegistration[];
            setAllRegistrations(registrationsData);
            setRegistrations(registrationsData);
        } catch (error) {
            console.error('Error fetching failed registrations:', error);
            toast.error('Error loading registrations');
        } finally {
            setLoading(false);
        }
    };

    const handleExportData = () => {
        try {
            // Create CSV header
            const headers = [
                'Name',
                'Email',
                'Mobile',
                'Payment ID',
                'Amount',
                'Selected Events',
                'Registration Date',
                'Rejection Date',
                'Rejection Reason',
                'Status'
            ].join(',');

            // Convert registrations to CSV rows
            const rows = registrations.map(reg => {
                return [
                    reg.name,
                    reg.email,
                    reg.mobile,
                    reg.paymentId,
                    reg.totalAmount,
                    (reg.selectedEvents || []).join('; '),
                    formatDate(reg.date),
                    formatDate(reg.verifiedAt),
                    reg.rejectionReason || 'N/A',
                    reg.status || 'Rejected'
                ].map(field => `"${field}"`).join(',');
            });

            // Combine headers and rows
            const csvContent = [headers, ...rows].join('\n');

            // Create and download the file
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().split('T')[0];
            a.download = `failed-registrations-${date}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Exported ${registrations.length} registrations successfully`);
        } catch (error) {
            console.error('Error exporting data:', error);
            toast.error('Error exporting data');
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        // Handle both Firestore Timestamp and string dates
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[600px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading failed registrations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Failed Registrations</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        A list of all rejected registrations.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button
                        onClick={handleExportData}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Export to Excel
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="max-w-xl">
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                        Search Registrations
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                            type="text"
                            name="search"
                            id="search"
                            className="block w-full rounded-md border-gray-300 pr-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                            placeholder="Search by email or mobile number"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                    {searchQuery && (
                        <p className="mt-2 text-sm text-gray-500">
                            Found {registrations.length} {registrations.length === 1 ? 'result' : 'results'}
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                            Name
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Email
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Mobile
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Payment ID
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Amount
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Selected Events
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Registration Date
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Rejection Date
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {registrations.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-8 text-center text-sm text-gray-500">
                                                No failed registrations found
                                            </td>
                                        </tr>
                                    ) : (
                                        registrations.map((registration) => (
                                            <tr key={registration.id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                    {registration.name}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {registration.email}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {registration.mobile}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {registration.paymentId}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    ₹{registration.totalAmount}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {registration.selectedEvents?.join(', ') || 'None'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {formatDate(registration.date)}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {formatDate(registration.verifiedAt)}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                        Rejected
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 
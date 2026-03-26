'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import ProtectedRoute from '../components/ProtectedRoute';

interface Accommodation {
    id: string;
    name: string;
    email?: string;
    mobile: string;
    gender: string;
    packageId: string;
    packageLabel: string;
    paymentId: string;
    price: number;
    timestamp: string;
    uid?: string;
    verifiedAt?: string;
}

function SuccessAccommodationsContent() {
    const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [allAccommodations, setAllAccommodations] = useState<Accommodation[]>([]);

    useEffect(() => {
        fetchAccommodations();
    }, []);

    useEffect(() => {
        if (searchQuery.trim()) {
            const queryLower = searchQuery.toLowerCase();
            const filtered = allAccommodations.filter(acc =>
                acc.paymentId?.toLowerCase().includes(queryLower) ||
                acc.name?.toLowerCase().includes(queryLower) ||
                acc.mobile?.includes(queryLower)
            );
            setAccommodations(filtered);
        } else {
            setAccommodations(allAccommodations);
        }
    }, [searchQuery, allAccommodations]);

    const fetchAccommodations = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(query(collection(db, 'successAccommodations')));
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Accommodation[];
            
            // Sort by verifiedAt descending (newest first)
            data.sort((a, b) => {
                const dateA = a.verifiedAt ? new Date(a.verifiedAt).getTime() : 0;
                const dateB = b.verifiedAt ? new Date(b.verifiedAt).getTime() : 0;
                return dateB - dateA;
            });

            setAllAccommodations(data);
            setAccommodations(data);
        } catch (error) {
            console.error('Error fetching success accommodations:', error);
            toast.error('Error loading verified accommodations');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestampValue: any) => {
        if (!timestampValue) return 'N/A';
        const date = timestampValue.toDate ? timestampValue.toDate() : new Date(timestampValue);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchAccommodations();
        setRefreshing(false);
        toast.success('Records refreshed successfully');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[600px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading verified accommodations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Success Accommodations</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        A list of all verified accommodation requests.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {refreshing ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Refreshing...
                            </>
                        ) : (
                            <>
                                <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <div className="max-w-xl">
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                        Search Verified Accommodations
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                            type="text"
                            name="search"
                            id="search"
                            className="block w-full rounded-md border-gray-300 pr-10 focus:border-green-500 focus:ring-green-500 sm:text-sm text-gray-900"
                            placeholder="Search by name, mobile, or payment ID"
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
                            Found {accommodations.length} matching records
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
                                            Gender
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Mobile
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Package
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Payment ID
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Amount
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Verified At
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {accommodations.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-sm text-gray-500">
                                                No verified accommodations found
                                            </td>
                                        </tr>
                                    ) : (
                                        accommodations.map((acc) => (
                                            <tr key={acc.id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                    {acc.name}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {acc.email || 'N/A'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {acc.gender}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {acc.mobile}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {acc.packageLabel || acc.packageId}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {acc.paymentId}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    ₹{acc.price}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {formatDate(acc.verifiedAt || acc.timestamp)}
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

export default function SuccessAccommodationsPage() {
    return (
        <ProtectedRoute>
            <SuccessAccommodationsContent />
        </ProtectedRoute>
    );
}

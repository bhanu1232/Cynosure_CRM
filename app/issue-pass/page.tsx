'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import ProtectedRoute from '../components/ProtectedRoute';

interface Registration {
    id: string;
    name: string;
    email: string;
    mobile: string;
    uid?: string;
    passIssued?: boolean;
    totalAmount?: number | string;
}

function IssuePassContent() {
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        fetchRegistrations();
    }, []);

    useEffect(() => {
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const filtered = allRegistrations.filter(registration =>
                registration.name.toLowerCase().includes(query) ||
                registration.email.toLowerCase().includes(query) ||
                registration.mobile.includes(query)
            );
            setRegistrations(filtered);
        } else {
            setRegistrations(allRegistrations);
        }
    }, [searchQuery, allRegistrations]);

    const fetchRegistrations = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'successRegistrations'));
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                email: doc.data().email,
                mobile: doc.data().mobile,
                uid: doc.data().uid,
                passIssued: doc.data().passIssued,
                totalAmount: doc.data().totalamount || doc.data().totalAmount
            })) as Registration[];

            setAllRegistrations(data);
            setRegistrations(data);

            // Keep input values empty by default as requested
            setInputValues({});

        } catch (error) {
            console.error('Error fetching registrations:', error);
            toast.error('Failed to load registrations');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (id: string, value: string) => {
        // Only allow numbers
        if (value === '' || /^\d+$/.test(value)) {
            setInputValues(prev => ({
                ...prev,
                [id]: value
            }));
        }
    };

    const handleIssuePass = async (registration: Registration) => {
        const numericId = inputValues[registration.id];

        if (!numericId || numericId.trim() === '') {
            toast.warning('Please enter a numeric ID first');
            return;
        }

        const newUid = `CS${numericId}`;
        setProcessingId(registration.id);

        try {
            const docRef = doc(db, 'successRegistrations', registration.id);
            await updateDoc(docRef, {
                uid: newUid,
                passIssued: true
            });

            // Update local state
            const updatedAll = allRegistrations.map(reg =>
                reg.id === registration.id ? { ...reg, uid: newUid, passIssued: true } : reg
            );
            setAllRegistrations(updatedAll);

            toast.success(`Pass issued successfully! UID updated to ${newUid}`);
        } catch (error) {
            console.error('Error updating UID:', error);
            toast.error('Failed to issue pass. Please try again.');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[600px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading participants...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Issue Passes</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Manage and assign official &apos;CS&apos; UIDs to verified participants.
                    </p>
                </div>
            </div>

            <div className="mb-6">
                <div className="max-w-xl">
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                        Search Participants
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                            type="text"
                            name="search"
                            id="search"
                            className="block w-full rounded-md border-gray-300 pr-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                            placeholder="Search by name, email, or mobile..."
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
                            Found {registrations.length} matching participants
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
                                            Participant
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Contact
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Total Amount
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Current UID
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Assign Pass ID
                                        </th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {registrations.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                                                No participants found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        registrations.map((registration) => (
                                            <tr key={registration.id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                    <div className="font-medium text-gray-900">{registration.name}</div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <div>{registration.email}</div>
                                                    <div className="text-gray-400">{registration.mobile}</div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
                                                    {registration.totalAmount ? `₹${registration.totalAmount}` : '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${registration.uid?.startsWith('CS')
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {registration.uid || 'None'}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    {registration.passIssued ? (
                                                        <span className="text-green-600 font-medium italic">
                                                            Pass issued ({registration.uid})
                                                        </span>
                                                    ) : (
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-gray-500 font-medium">CS</span>
                                                            <input
                                                                type="text"
                                                                value={inputValues[registration.id] || ''}
                                                                onChange={(e) => handleInputChange(registration.id, e.target.value)}
                                                                placeholder="123"
                                                                className="block w-24 rounded-md border border-gray-300 px-3 py-1.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                                                            />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    {!registration.passIssued && (
                                                        <button
                                                            onClick={() => handleIssuePass(registration)}
                                                            disabled={processingId === registration.id || !inputValues[registration.id]}
                                                            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${(!inputValues[registration.id] || processingId === registration.id) ? 'opacity-50 cursor-not-allowed' : ''
                                                                }`}
                                                        >
                                                            {processingId === registration.id ? (
                                                                <>
                                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                    Updating...
                                                                </>
                                                            ) : (
                                                                'Issue Pass'
                                                            )}
                                                        </button>
                                                    )}
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

export default function IssuePassPage() {
    return (
        <ProtectedRoute>
            <IssuePassContent />
        </ProtectedRoute>
    );
}

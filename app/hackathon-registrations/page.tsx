'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import ProtectedRoute from '../components/ProtectedRoute';
import * as XLSX from 'xlsx';

interface Registration {
    id: string;
    event: string;
    eventId: string;
    collegeName: string;
    registrationType: string;
    teamName: string;
    leaderName: string;
    leaderEmail: string;
    leaderPhone: string;
    participants: string[];
    fee: number;
    paymentId: string;
    date: string;
    status?: string;
    verifiedAt?: string;
    uid?: string;
    // New fields for individual registrations (Ideathon/Paper Presentation)
    name?: string;
    email?: string;
    phone?: string;
}

function HackathonRegistrationsContent() {
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingActions, setProcessingActions] = useState<{ [key: string]: 'verify' | 'reject' | null }>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);

    useEffect(() => {
        fetchRegistrations();
    }, []);

    useEffect(() => {
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const filtered = allRegistrations.filter(r =>
                r.paymentId?.toLowerCase().includes(q) ||
                r.teamName?.toLowerCase().includes(q) ||
                r.leaderName?.toLowerCase().includes(q) ||
                r.collegeName?.toLowerCase().includes(q)
            );
            setRegistrations(filtered);
        } else {
            setRegistrations(allRegistrations);
        }
    }, [searchQuery, allRegistrations]);

    const fetchRegistrations = async () => {
        setLoading(true);
        try {
            const registrationsSnapshot = await getDocs(collection(db, 'separateRegistrations'));
            const registrationsData = registrationsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Registration[];
            setAllRegistrations(registrationsData);
            setRegistrations(registrationsData);
        } catch (error) {
            console.error('Error fetching hackathon registrations:', error);
            toast.error('Error loading hackathon registrations');
        } finally {
            setLoading(false);
        }
    };

    const handleVerification = async (registration: Registration, isVerified: boolean) => {
        const action = isVerified ? 'verify' : 'reject';
        setProcessingActions(prev => ({ ...prev, [registration.id]: action }));

        try {
            try {
                const recipientEmail = registration.leaderEmail || registration.email || '';
                const recipientName = registration.leaderName || registration.name || 'Participant';

                const emailData = {
                    to: recipientEmail,
                    name: recipientName,
                    uid: registration.paymentId || registration.id,
                    submissionType: registration.event || 'Special Event Registration',
                    isRejected: !isVerified,
                    whatsappLink: 'https://chat.whatsapp.com/E2RU5DxY04O4WFZynZITIQ?mode=gi_t',
                    whatsappGroupName: 'Cynosure Announcements'
                };

                const response = await fetch('/api/send-verification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(emailData),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Failed to send email:', errorData);
                    toast.error(`Failed to send ${isVerified ? 'verification' : 'rejection'} email. Please try again.`);
                    return;
                }
            } catch (emailError: any) {
                console.error('Error sending email:', emailError);
                toast.error(`Failed to send ${isVerified ? 'verification' : 'rejection'} email. Please try again.`);
                return;
            }

            const targetCollection = isVerified ? 'successSeparateRegistrations' : 'failedSeparateRegistrations';
            await addDoc(collection(db, targetCollection), {
                ...registration,
                verifiedAt: new Date().toISOString(),
                status: isVerified ? 'verified' : 'rejected',
                date: new Date().toISOString()
            });

            await deleteDoc(doc(db, 'separateRegistrations', registration.id));

            const updatedRegistrations = allRegistrations.filter(reg => reg.id !== registration.id);
            setAllRegistrations(updatedRegistrations);
            setRegistrations(updatedRegistrations.filter(reg => {
                const q = searchQuery.toLowerCase();
                return !searchQuery.trim() ||
                    reg.paymentId?.toLowerCase().includes(q) ||
                    reg.teamName?.toLowerCase().includes(q) ||
                    reg.leaderName?.toLowerCase().includes(q) ||
                    reg.collegeName?.toLowerCase().includes(q);
            }));

            toast.success(`Registration ${isVerified ? 'verified' : 'rejected'} and email sent successfully`);
        } catch (error) {
            console.error('Error processing hackathon registration:', error);
            toast.error('Error processing hackathon registration');
        } finally {
            setProcessingActions(prev => ({ ...prev, [registration.id]: null }));
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchRegistrations();
        setRefreshing(false);
        toast.success('Records refreshed successfully');
    };

    const handleExportToExcel = () => {
        if (registrations.length === 0) {
            toast.error('No records to export');
            return;
        }

        const exportData = registrations.map((reg, index) => ({
            'S.No': index + 1,
            'Registration ID': reg.id,
            'Event': reg.event || 'N/A',
            'Registration Type': reg.registrationType || 'N/A',
            'Team Name': reg.teamName || 'N/A',
            'Leader Name': reg.leaderName || reg.name || 'N/A',
            'Leader Email': reg.leaderEmail || reg.email || 'N/A',
            'Leader Phone': reg.leaderPhone || reg.phone || 'N/A',
            'Team Members': reg.participants && reg.participants.length > 0
                ? reg.participants.join(', ')
                : 'N/A',
            'Total Members': reg.participants ? reg.participants.length + 1 : 1,
            'College Name': reg.collegeName || 'N/A',
            'Fee (₹)': reg.fee || 0,
            'Payment ID': reg.paymentId || 'N/A',
            'Status': reg.status || 'Pending',
            'Registration Date': formatDate(reg.date),
            'Verified At': reg.verifiedAt ? formatDate(reg.verifiedAt) : 'N/A',
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Auto-width columns
        const colWidths = Object.keys(exportData[0] || {}).map(key => ({
            wch: Math.max(key.length, ...exportData.map(row => String((row as any)[key] || '').length))
        }));
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Hackathon Registrations');

        const fileName = `Hackathon_Registrations_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        toast.success(`Exported ${registrations.length} records to ${fileName}`);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[600px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading hackathon registrations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Hackathon Registrations</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Total: <span className="font-semibold text-gray-800">{registrations.length}</span> registrations
                        {searchQuery && ` (filtered from ${allRegistrations.length})`}
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 flex gap-3">
                    {/* Export to Excel Button */}
                    <button
                        onClick={handleExportToExcel}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-sm transition-colors"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export to Excel
                    </button>

                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={`inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {refreshing ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Refreshing...
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </>
                        )}
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
                            className="block w-full rounded-md border-gray-300 pr-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            placeholder="Search by payment ID, team name, leader name, college..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="mt-4 flex flex-col">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sm:pl-6">
                                            #
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Event
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Team Name
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Leader Details
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Team Members
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            College Name
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Payment Info
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {registrations.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="py-12 text-center text-sm text-gray-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span>No hackathon registrations found</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        registrations.map((registration, index) => (
                                            <tr key={registration.id} className="hover:bg-gray-50 transition-colors">
                                                {/* S.No */}
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-400 sm:pl-6">
                                                    {index + 1}
                                                </td>

                                                {/* Event */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <div className="font-medium text-gray-900">{registration.event || 'N/A'}</div>
                                                    <div className="text-gray-400 text-xs capitalize">{registration.registrationType}</div>
                                                </td>

                                                {/* Team Name */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {registration.teamName || 'Individual'}
                                                    </span>
                                                </td>

                                                {/* Leader Details */}
                                                <td className="px-3 py-4 text-sm">
                                                    <div className="font-medium text-gray-900">{registration.leaderName || registration.name || 'N/A'}</div>
                                                    <div className="text-gray-500 text-xs">{registration.leaderEmail || registration.email || 'N/A'}</div>
                                                    <div className="text-gray-500 text-xs">{registration.leaderPhone || registration.phone || 'N/A'}</div>
                                                </td>

                                                {/* Team Members */}
                                                <td className="px-3 py-4 text-sm text-gray-600 max-w-xs">
                                                    {registration.participants && registration.participants.length > 0 ? (
                                                        <ul className="space-y-0.5">
                                                            {registration.participants.map((member, i) => (
                                                                <li key={i} className="flex items-center gap-1 text-xs">
                                                                    <span className="inline-block w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-center text-[10px] font-bold leading-4 flex-shrink-0">
                                                                        {i + 1}
                                                                    </span>
                                                                    {member}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">No additional members</span>
                                                    )}
                                                </td>

                                                {/* College Name */}
                                                <td className="px-3 py-4 text-sm text-gray-700">
                                                    <div className="max-w-[160px]" title={registration.collegeName}>
                                                        {registration.collegeName || 'N/A'}
                                                    </div>
                                                </td>

                                                {/* Payment Info */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <div className="font-semibold text-gray-900">₹{registration.fee}</div>
                                                    <div className="text-gray-400 text-xs font-mono">{registration.paymentId}</div>
                                                </td>

                                                {/* Date */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {formatDate(registration.date)}
                                                </td>

                                                {/* Status */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    {registration.status === 'verified' ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            ✓ Verified
                                                        </span>
                                                    ) : registration.status === 'rejected' ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            ✗ Rejected
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            ⏳ Pending
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <div className="flex flex-col gap-1.5">
                                                        <button
                                                            onClick={() => handleVerification(registration, true)}
                                                            disabled={!!processingActions[registration.id]}
                                                            className={`inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors ${processingActions[registration.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {processingActions[registration.id] === 'verify' ? (
                                                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                                                            ) : (
                                                                'Verify'
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleVerification(registration, false)}
                                                            disabled={!!processingActions[registration.id]}
                                                            className={`inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors ${processingActions[registration.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {processingActions[registration.id] === 'reject' ? (
                                                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                                                            ) : (
                                                                'Reject'
                                                            )}
                                                        </button>
                                                    </div>
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

export default function HackathonRegistrationsPage() {
    return (
        <ProtectedRoute>
            <HackathonRegistrationsContent />
        </ProtectedRoute>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import ProtectedRoute from '../components/ProtectedRoute';
import * as XLSX from 'xlsx';

interface Registration {
    id: string;
    name: string;
    email: string;
    mobile: string;
    uid?: string;
    passIssued?: boolean;
    eventId?: string;
    event?: string;
    collegeName?: string;
    teamName?: string;
    participants?: string[];
    paymentId?: string;
    fee?: number;
    date?: string;
    status?: string;
    verifiedAt?: string;
    registrationType?: string;
}

function HackathonIssuePassContent() {
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
                registration.mobile.includes(query) ||
                (registration.collegeName && registration.collegeName.toLowerCase().includes(query)) ||
                (registration.teamName && registration.teamName.toLowerCase().includes(query)) ||
                (registration.event && registration.event.toLowerCase().includes(query)) ||
                (registration.paymentId && registration.paymentId.toLowerCase().includes(query))
            );
            setRegistrations(filtered);
        } else {
            setRegistrations(allRegistrations);
        }
    }, [searchQuery, allRegistrations]);

    const fetchRegistrations = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'successSeparateRegistrations'));
            const data = snapshot.docs.map(docSnap => {
                const d = docSnap.data();
                return {
                    // Spread ALL raw Firestore fields first so nothing is lost
                    ...d,
                    // Override the document id
                    id: docSnap.id,
                    // Normalise name/email/mobile to handle both individual and team registrations
                    name: d.leaderName || d.name || 'Unknown Participant',
                    email: d.leaderEmail || d.email || '',
                    mobile: d.leaderPhone || d.phone || d.mobile || '',
                    // Safely coerce participants — Firestore can return them as array or undefined
                    participants: Array.isArray(d.participants) ? d.participants : [],
                    paymentId: d.paymentId ?? '',
                    fee: d.fee ?? null,
                    date: d.date,
                    status: d.status,
                    verifiedAt: d.verifiedAt,
                    registrationType: d.registrationType,
                };
            }) as Registration[];

            // Debug: log first record to confirm all fields are present
            if (data.length > 0) {
                console.log('[IssuePass] Sample record:', {
                    teamName: data[0].teamName,
                    participants: data[0].participants,
                    paymentId: data[0].paymentId,
                    fee: data[0].fee,
                });
            }

            setAllRegistrations(data);
            setRegistrations(data);
            setInputValues({});
        } catch (error) {
            console.error('Error fetching hackathon registrations:', error);
            toast.error('Failed to load hackathon registrations');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (id: string, value: string) => {
        if (value === '' || /^\d+$/.test(value)) {
            setInputValues(prev => ({ ...prev, [id]: value }));
        }
    };

    const getPrefix = (eventId?: string) => {
        if (!eventId) return 'HACK';
        const lower = eventId.toLowerCase();
        if (lower.includes('paper')) return 'PAPER';
        if (lower.includes('idea')) return 'IDEA';
        return 'HACK';
    };

    const handleIssuePass = async (registration: Registration) => {
        const numericId = inputValues[registration.id];
        if (!numericId || numericId.trim() === '') {
            toast.warning('Please enter a numeric ID first');
            return;
        }

        const prefix = getPrefix(registration.eventId);
        const newUid = `${prefix}${numericId}`;
        setProcessingId(registration.id);

        try {
            const docRef = doc(db, 'successSeparateRegistrations', registration.id);
            await updateDoc(docRef, { uid: newUid, passIssued: true });

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

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const handleExportToExcel = () => {
        if (registrations.length === 0) {
            toast.error('No records to export');
            return;
        }

        const exportData = registrations.map((reg, index) => ({
            'S.No': index + 1,
            'Pass UID': reg.uid || 'Not Issued',
            'Pass Issued': reg.passIssued ? 'Yes' : 'No',
            'Event': reg.event || 'N/A',
            'Registration Type': reg.registrationType || 'N/A',
            'Team Name': reg.teamName || 'N/A',
            'Leader Name': reg.name || 'N/A',
            'Leader Email': reg.email || 'N/A',
            'Leader Phone': reg.mobile || 'N/A',
            'Team Members': reg.participants && reg.participants.length > 0
                ? reg.participants.join(', ')
                : 'N/A',
            'Total Members (incl. Leader)': reg.participants ? reg.participants.length + 1 : 1,
            'College Name': reg.collegeName || 'N/A',
            'Fee (₹)': reg.fee || 0,
            'Payment ID': reg.paymentId || 'N/A',
            'Status': reg.status || 'N/A',
            'Registration Date': formatDate(reg.date),
            'Verified At': formatDate(reg.verifiedAt),
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Auto-width columns
        const colWidths = Object.keys(exportData[0] || {}).map(key => ({
            wch: Math.max(key.length, ...exportData.map(row => String((row as any)[key] || '').length))
        }));
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Hackathon Issue Pass');

        const fileName = `Hackathon_Issue_Pass_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        toast.success(`Exported ${registrations.length} records to ${fileName}`);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[600px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading hackathon participants...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Issue Hackathon Passes</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Total: <span className="font-semibold text-gray-800">{registrations.length}</span> verified participants
                        {searchQuery && ` (filtered from ${allRegistrations.length})`}
                    </p>
                </div>
                {/* Export to Excel Button */}
                <div className="mt-4 sm:mt-0 sm:ml-16">
                    <button
                        onClick={handleExportToExcel}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-sm transition-colors"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export to Excel
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="max-w-xl">
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                        Search Hackathon Participants
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                            type="text"
                            name="search"
                            id="search"
                            className="block w-full rounded-md border-gray-300 pr-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                            placeholder="Search by name, email, team name, college, payment ID..."
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

            {/* Table */}
            <div className="mt-4 flex flex-col">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sm:pl-6">#</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Event</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Team Name</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Leader Details</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Team Members</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">College Name</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Current UID</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assign Pass ID</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
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
                                                    <span>No participants found matching your criteria.</span>
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
                                                    <div className="font-medium text-gray-900">{registration.event || 'Hackathon'}</div>
                                                    <div className="text-gray-400 text-xs capitalize">{registration.registrationType || ''}</div>
                                                </td>

                                                {/* Team Name */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {registration.teamName || 'Individual'}
                                                    </span>
                                                </td>

                                                {/* Leader Details */}
                                                <td className="px-3 py-4 text-sm">
                                                    <div className="font-medium text-gray-900">{registration.name}</div>
                                                    <div className="text-gray-500 text-xs">{registration.email}</div>
                                                    <div className="text-gray-500 text-xs">{registration.mobile}</div>
                                                </td>

                                                {/* Team Members */}
                                                <td className="px-3 py-4 text-sm text-gray-600">
                                                    {registration.participants && registration.participants.length > 0 ? (
                                                        <ul className="space-y-0.5">
                                                            {registration.participants.map((member, i) => (
                                                                <li key={i} className="flex items-center gap-1 text-xs">
                                                                    <span className="inline-flex w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-center text-[10px] font-bold leading-4 items-center justify-center flex-shrink-0">
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

                                                {/* Payment */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <div className="font-semibold text-gray-900">₹{registration.fee ?? 'N/A'}</div>
                                                    <div className="text-gray-400 text-xs font-mono">{registration.paymentId || 'N/A'}</div>
                                                </td>

                                                {/* Current UID */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${registration.uid
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {registration.uid || 'None'}
                                                    </span>
                                                </td>

                                                {/* Assign Pass ID */}
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    {registration.passIssued ? (
                                                        <span className="text-green-600 font-medium italic text-xs">
                                                            ✓ Pass issued ({registration.uid})
                                                        </span>
                                                    ) : (
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-gray-500 font-medium text-xs">{getPrefix(registration.eventId)}</span>
                                                            <input
                                                                type="text"
                                                                value={inputValues[registration.id] || ''}
                                                                onChange={(e) => handleInputChange(registration.id, e.target.value)}
                                                                placeholder="123"
                                                                className="block w-20 rounded-md border border-gray-300 px-2 py-1.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                                                            />
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    {!registration.passIssued && (
                                                        <button
                                                            onClick={() => handleIssuePass(registration)}
                                                            disabled={processingId === registration.id || !inputValues[registration.id]}
                                                            className={`inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${(!inputValues[registration.id] || processingId === registration.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {processingId === registration.id ? (
                                                                <>
                                                                    <svg className="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

export default function HackathonIssuePassPage() {
    return (
        <ProtectedRoute>
            <HackathonIssuePassContent />
        </ProtectedRoute>
    );
}

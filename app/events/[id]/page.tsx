'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-toastify';
import { Query, DocumentData } from 'firebase/firestore';

interface Event {
    id: string;
    name: string;
    description: string;
    date: string;
    venue: string;
    capacity: number;
    registeredParticipants: string[];
    winners: {
        first: string | null;
        second: string | null;
        third: string | null;
    };
}

interface Participant {
    id: string;
    name: string;
    email: string;
    uid: string;
    selectedEvents?: string[];
}

export default function EventDetails() {
    const params = useParams();
    const eventId = params.id as string;

    const [event, setEvent] = useState<Event | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [registeredParticipants, setRegisteredParticipants] = useState<Participant[]>([]);
    const [loadingParticipants, setLoadingParticipants] = useState(true);
    const [showWinnersModal, setShowWinnersModal] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState<'first' | 'second' | 'third' | null>(null);
    const [winnerSearchQuery, setWinnerSearchQuery] = useState('');
    const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
    const [allRegistrations, setAllRegistrations] = useState<Participant[]>([]);
    const [filteredRegistrations, setFilteredRegistrations] = useState<Participant[]>([]);

    useEffect(() => {
        fetchEventDetails();
        fetchAllRegistrations();
    }, [eventId]);

    useEffect(() => {
        if (registeredParticipants.length > 0) {
            setFilteredParticipants(registeredParticipants);
        }
    }, [registeredParticipants]);

    useEffect(() => {
        if (winnerSearchQuery.trim()) {
            const query = winnerSearchQuery.toLowerCase();
            const filtered = registeredParticipants.filter(participant =>
                participant.name.toLowerCase().includes(query) ||
                participant.email.toLowerCase().includes(query) ||
                participant.uid.includes(query)
            );
            setFilteredParticipants(filtered);
        } else {
            setFilteredParticipants(registeredParticipants);
        }
    }, [winnerSearchQuery, registeredParticipants]);

    useEffect(() => {
        if (allRegistrations.length > 0) {
            const searchQueryLower = searchQuery.toLowerCase();
            const filtered = allRegistrations.filter(participant =>
                participant.name.toLowerCase().includes(searchQueryLower) ||
                participant.email.toLowerCase().includes(searchQueryLower) ||
                participant.uid.toLowerCase().includes(searchQueryLower)
            );
            setFilteredRegistrations(filtered);
        }
    }, [searchQuery, allRegistrations]);

    const fetchEventDetails = async () => {
        setLoading(true);
        try {
            const eventDoc = await getDoc(doc(db, 'events', eventId));
            if (eventDoc.exists()) {
                const eventData = { id: eventDoc.id, ...eventDoc.data() } as Event;
                setEvent(eventData);

                // Fetch registered participants details from successRegistrations
                if (eventData.registeredParticipants?.length > 0) {
                    setLoadingParticipants(true);
                    const participantsSnapshot = await getDocs(
                        query(
                            collection(db, 'successRegistrations'),
                            where('uid', 'in', eventData.registeredParticipants)
                        )
                    );
                    const participantsData = participantsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as Participant[];
                    setRegisteredParticipants(participantsData);
                    setLoadingParticipants(false);
                } else {
                    setLoadingParticipants(false);
                }
            }
        } catch (error) {
            console.error('Error fetching event details:', error);
            toast.error('Error loading event details');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllRegistrations = async () => {
        try {
            const registrationsRef = collection(db, 'successRegistrations');
            const registrationsSnapshot = await getDocs(registrationsRef);
            const registrationsData = registrationsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Participant[];
            setAllRegistrations(registrationsData);
            setFilteredRegistrations(registrationsData);
        } catch (error) {
            console.error('Error fetching registrations:', error);
            toast.error('Error loading registrations');
        }
    };

    const registerParticipant = async (participant: Participant) => {
        if (!event) return;

        try {
            // Initialize registeredParticipants as empty array if it doesn't exist
            const currentRegisteredParticipants = event.registeredParticipants || [];

            // Check if participant is already registered
            if (currentRegisteredParticipants.includes(participant.uid)) {
                toast.error('This participant is already registered for this event.');
                return;
            }

            // Check if event is at capacity
            if (registeredParticipants.length >= event.capacity) {
                toast.error('This event has reached its capacity.');
                return;
            }

            // Update event document
            const eventRef = doc(db, 'events', eventId);
            await updateDoc(eventRef, {
                registeredParticipants: arrayUnion(participant.uid)
            });

            // Update local state
            setEvent(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    registeredParticipants: [...currentRegisteredParticipants, participant.uid]
                };
            });
            setRegisteredParticipants(prev => [...prev, participant]);
            setFilteredRegistrations(prev =>
                prev.map(p => p.id === participant.id
                    ? { ...p, isRegistered: true }
                    : p
                )
            );

            toast.success('Participant successfully added to the event!');
        } catch (error) {
            console.error('Error registering participant:', error);
            toast.error('Error adding participant to the event. Please try again.');
        }
    };

    const handleSelectWinner = async (participant: Participant, position: 'first' | 'second' | 'third') => {
        if (!event) return;

        // Check if participant already holds another position
        const currentPosition = Object.entries(event.winners).find(([pos, uid]) => uid === participant.uid);
        if (currentPosition && currentPosition[0] !== position) {
            toast.error('This participant already holds another position');
            return;
        }

        // Check if another participant already holds this position
        const currentWinner = event.winners[position];
        if (currentWinner === participant.uid) {
            toast.error('This participant already holds this position');
            return;
        }

        try {
            const updatedWinners = {
                ...event.winners,
                [position]: participant.uid
            };

            const eventRef = doc(db, 'events', eventId);
            await updateDoc(eventRef, {
                winners: updatedWinners
            });

            setEvent(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    winners: updatedWinners
                };
            });

            toast.success(`${position.charAt(0).toUpperCase() + position.slice(1)} place winner selected!`);
            setShowWinnersModal(false);
            setSelectedPosition(null);
            setWinnerSearchQuery('');
        } catch (error) {
            console.error('Error selecting winner:', error);
            toast.error('Error selecting winner. Please try again.');
        }
    };

    const getWinnerDetails = (position: 'first' | 'second' | 'third') => {
        if (!event?.winners?.[position]) return null;
        return registeredParticipants.find(p => p.uid === event.winners[position]);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[600px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading event details...</p>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center py-12">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Event Not Found</h2>
                    <p className="text-gray-500 mb-6">The event you're looking for doesn't exist or has been removed.</p>
                    <a
                        href="/events"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Back to Events
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
                    <a
                        href="/events"
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        ← Back to Events
                    </a>
                </div>
                <p className="mt-2 text-gray-600">{event.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Details</h2>
                        <dl className="grid grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Date</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {new Date(event.date).toLocaleDateString()}
                                </dd>
                            </div>
                            <div className="col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Venue</dt>
                                <dd className="mt-1 text-sm text-gray-900">{event.venue}</dd>
                            </div>
                            <div className="col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Capacity</dt>
                                <dd className="mt-1 text-sm text-gray-900">{event.capacity}</dd>
                            </div>
                            <div className="col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Registered</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${registeredParticipants.length >= event.capacity
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-green-100 text-green-800'
                                        }`}>
                                        {registeredParticipants.length} / {event.capacity}
                                    </span>
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Registrations</h2>
                        <div className="mb-4">
                            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                                Search Registrations
                            </label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    name="search"
                                    id="search"
                                    className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                    placeholder="Search by name, email, or ID"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                            {filteredRegistrations.length === 0 ? (
                                <div className="text-center py-4 text-gray-500">
                                    No registrations found
                                </div>
                            ) : (
                                filteredRegistrations.map((participant) => (
                                    <div
                                        key={participant.uid}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors duration-150"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {participant.name}
                                            </p>
                                            <p className="text-sm text-gray-500">{participant.email}</p>
                                            <p className="text-xs text-gray-400">ID: {participant.uid}</p>
                                        </div>
                                        <button
                                            onClick={() => registerParticipant(participant)}
                                            className={`inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md ${event?.registeredParticipants?.includes(participant.uid)
                                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                                : 'text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                                                }`}
                                            disabled={event?.registeredParticipants?.includes(participant.uid)}
                                        >
                                            {event?.registeredParticipants?.includes(participant.uid) ? 'Added' : 'Add'}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Winners Section */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">Event Winners</h2>
                            {registeredParticipants.length > 0 && (
                                <button
                                    onClick={() => setShowWinnersModal(true)}
                                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Select Winners
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {['first', 'second', 'third'].map((position) => {
                                const winner = getWinnerDetails(position as 'first' | 'second' | 'third');
                                return (
                                    <div
                                        key={position}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                    >
                                        <div>
                                            <span className="text-sm font-medium text-gray-500">
                                                {position.charAt(0).toUpperCase() + position.slice(1)} Place
                                            </span>
                                            {winner ? (
                                                <div className="mt-1">
                                                    <p className="text-sm font-medium text-gray-900">{winner.name}</p>
                                                    <p className="text-sm text-gray-500">{winner.email}</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 mt-1">Not selected</p>
                                            )}
                                        </div>
                                        {winner && (
                                            <div className={`px-2 py-1 rounded text-sm font-medium
                                                ${position === 'first' ? 'bg-yellow-100 text-yellow-800' : ''}
                                                ${position === 'second' ? 'bg-gray-100 text-gray-800' : ''}
                                                ${position === 'third' ? 'bg-orange-100 text-orange-800' : ''}
                                            `}>
                                                🏆
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Registered Participants Section */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Registered Participants
                            <span className="ml-2 text-sm font-normal text-gray-500">
                                ({registeredParticipants.length} / {event.capacity})
                            </span>
                        </h2>
                        {loadingParticipants ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {registeredParticipants.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                                        <p className="text-gray-500">No participants registered yet</p>
                                    </div>
                                ) : (
                                    registeredParticipants.map((participant) => (
                                        <div
                                            key={participant.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {participant.name}
                                                </p>
                                                <p className="text-sm text-gray-500">{participant.email}</p>
                                            </div>
                                            <span className="text-sm text-gray-500">ID: {participant.uid}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Winners Selection Modal */}
            {showWinnersModal && (
                <div className="fixed z-10 inset-0 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                            Select Winners
                                        </h3>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Position
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['first', 'second', 'third'].map((position) => (
                                                    <button
                                                        key={position}
                                                        type="button"
                                                        onClick={() => setSelectedPosition(position as 'first' | 'second' | 'third')}
                                                        className={`px-3 py-2 rounded-md text-sm font-medium
                                                            ${selectedPosition === position
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {position.charAt(0).toUpperCase() + position.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="winner-search" className="block text-sm font-medium text-gray-700 mb-2">
                                                Search Participants
                                            </label>
                                            <input
                                                type="text"
                                                id="winner-search"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                                placeholder="Search by name, email, or ID"
                                                value={winnerSearchQuery}
                                                onChange={(e) => setWinnerSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <div className="max-h-60 overflow-y-auto">
                                            {filteredParticipants.length === 0 ? (
                                                <div className="text-center py-4 text-gray-500">
                                                    No participants found
                                                </div>
                                            ) : (
                                                filteredParticipants.map((participant) => {
                                                    const currentPosition = Object.entries(event?.winners || {}).find(([_, uid]) => uid === participant.uid);
                                                    return (
                                                        <div
                                                            key={participant.id}
                                                            className={`flex items-center justify-between p-3 hover:bg-gray-50 rounded-md ${selectedPosition && !currentPosition ? 'cursor-pointer' : 'cursor-not-allowed'
                                                                }`}
                                                            onClick={() => {
                                                                if (selectedPosition && !currentPosition) {
                                                                    handleSelectWinner(participant, selectedPosition);
                                                                }
                                                            }}
                                                        >
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">
                                                                    {participant.name}
                                                                </p>
                                                                <p className="text-sm text-gray-500">{participant.email}</p>
                                                            </div>
                                                            {currentPosition && (
                                                                <span className={`text-xs font-medium px-2 py-1 rounded-full
                                                                    ${currentPosition[0] === 'first' ? 'bg-yellow-100 text-yellow-800' : ''}
                                                                    ${currentPosition[0] === 'second' ? 'bg-gray-100 text-gray-800' : ''}
                                                                    ${currentPosition[0] === 'third' ? 'bg-orange-100 text-orange-800' : ''}
                                                                `}>
                                                                    Current {currentPosition[0]} place
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={() => setShowWinnersModal(false)}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 
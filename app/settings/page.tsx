'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';

interface Event {
    id: string;
    name: string;
    description: string;
    date: string;
    venue: string;
    capacity: number;
    registeredParticipants: string[];
    password: string;
}

export default function Settings() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEvent, setNewEvent] = useState({
        name: '',
        description: '',
        date: '',
        venue: '',
        capacity: '',
        password: '',
    });

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const eventsSnapshot = await getDocs(collection(db, 'events'));
            const eventsData = eventsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Event[];
            setEvents(eventsData);
        } catch (error) {
            console.error('Error fetching events:', error);
            toast.error('Error fetching events');
        } finally {
            setLoading(false);
        }
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEvent.password.trim()) {
            toast.error('Please set a password for the event');
            return;
        }
        try {
            await addDoc(collection(db, 'events'), {
                ...newEvent,
                capacity: parseInt(newEvent.capacity),
                registeredParticipants: [],
                winners: {
                    first: null,
                    second: null,
                    third: null
                },
                createdAt: new Date().toISOString(),
            });
            setShowAddModal(false);
            setNewEvent({
                name: '',
                description: '',
                date: '',
                venue: '',
                capacity: '',
                password: '',
            });
            toast.success('Event created successfully');
            fetchEvents();
        } catch (error) {
            console.error('Error adding event:', error);
            toast.error('Error creating event');
        }
    };

    const handleDeleteEvent = async (event: Event) => {
        setSelectedEvent(event);
    };

    const confirmDelete = async () => {
        if (!selectedEvent) return;

        try {
            await deleteDoc(doc(db, 'events', selectedEvent.id));
            setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
            setSelectedEvent(null);
            toast.success('Event deleted successfully');
        } catch (error) {
            console.error('Error deleting event:', error);
            toast.error('Error deleting event');
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Create New Event
                </button>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Event Management</h2>
                {loading ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {events.map((event) => (
                            <div
                                key={event.id}
                                className="flex items-center justify-between p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200"
                            >
                                <div className="flex-1">
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">{event.name}</h3>
                                    <p className="text-sm text-gray-500 mb-2">{event.description}</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">Date:</span>
                                            <p className="font-medium text-gray-900">
                                                {new Date(event.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Venue:</span>
                                            <p className="font-medium text-gray-900">{event.venue}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Capacity:</span>
                                            <p className="font-medium text-gray-900">{event.capacity}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Registered:</span>
                                            <p className="font-medium text-gray-900">
                                                {event.registeredParticipants?.length || 0} / {event.capacity}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteEvent(event)}
                                    className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                        {events.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No events created yet
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Event Modal */}
            {showAddModal && (
                <div className="fixed z-10 inset-0 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <form onSubmit={handleAddEvent} className="bg-white">
                                <div className="px-4 pt-5 pb-4 sm:p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-medium text-gray-900">Create New Event</h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddModal(false)}
                                            className="text-gray-400 hover:text-gray-500"
                                        >
                                            <span className="sr-only">Close</span>
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                                Event Name
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                id="name"
                                                required
                                                value={newEvent.name}
                                                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                                Description
                                            </label>
                                            <textarea
                                                name="description"
                                                id="description"
                                                required
                                                rows={3}
                                                value={newEvent.description}
                                                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                                                Date
                                            </label>
                                            <input
                                                type="date"
                                                name="date"
                                                id="date"
                                                required
                                                value={newEvent.date}
                                                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="venue" className="block text-sm font-medium text-gray-700">
                                                Venue
                                            </label>
                                            <input
                                                type="text"
                                                name="venue"
                                                id="venue"
                                                required
                                                value={newEvent.venue}
                                                onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                                                Capacity
                                            </label>
                                            <input
                                                type="number"
                                                name="capacity"
                                                id="capacity"
                                                required
                                                min="1"
                                                value={newEvent.capacity}
                                                onChange={(e) => setNewEvent({ ...newEvent, capacity: e.target.value })}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                                Event Password
                                            </label>
                                            <input
                                                type="password"
                                                name="password"
                                                id="password"
                                                required
                                                value={newEvent.password}
                                                onChange={(e) => setNewEvent({ ...newEvent, password: e.target.value })}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                                placeholder="Set a password to protect the event"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="submit"
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Create Event
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {selectedEvent && (
                <div className="fixed z-10 inset-0 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                                            Delete Event
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                Are you sure you want to delete the event "{selectedEvent.name}"? This action cannot be undone.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={confirmDelete}
                                >
                                    Delete
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setSelectedEvent(null)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 
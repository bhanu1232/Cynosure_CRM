'use client';

import { useState } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';

interface ParticipantForm {
    name: string;
    email: string;
    mobile: string;
    paymentId: string;
    totalAmount: number;
    collegeName: string;
}

export default function AddParticipant() {
    const [formData, setFormData] = useState<ParticipantForm>({
        name: '',
        email: '',
        mobile: '',
        paymentId: '',
        totalAmount: 500,
        collegeName: '',
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            // Validate form data
            if (!formData.name || !formData.email || !formData.mobile || !formData.paymentId ||
                !formData.collegeName) {
                throw new Error('All fields are required');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                throw new Error('Invalid email format');
            }

            // Validate mobile number format (10 digits)
            const mobileRegex = /^\d{10}$/;
            if (!mobileRegex.test(formData.mobile)) {
                throw new Error('Mobile number must be exactly 10 digits');
            }

            // Check if mobile number already exists in registrations
            const registrationsRef = collection(db, 'registrations');
            const mobileQuery = query(
                registrationsRef,
                where('mobile', '==', formData.mobile)
            );
            const mobileSnapshot = await getDocs(mobileQuery);

            if (!mobileSnapshot.empty) {
                throw new Error('This mobile number is already registered');
            }

            // Generate UID
            const uid = `CS${formData.mobile}`;

            // Add participant to registrations collection (for verification queue)
            await addDoc(registrationsRef, {
                name: formData.name.toLowerCase(),
                email: formData.email.toLowerCase(),
                mobile: formData.mobile,
                paymentId: formData.paymentId,
                totalAmount: formData.totalAmount,
                collegeName: formData.collegeName,
                date: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                spotRegistration: true,
            });

            // Reset form and show success message
            setFormData({
                name: '',
                email: '',
                mobile: '',
                paymentId: '',
                totalAmount: 500,
                collegeName: '',
            });
            setSuccess(true);
            toast.success(`Registration successful! Your ID is: ${uid}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            toast.error(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // For mobile number, only allow digits and max 10 characters
        if (name === 'mobile') {
            const numbersOnly = value.replace(/\D/g, '').slice(0, 10);
            setFormData(prev => ({
                ...prev,
                [name]: numbersOnly
            }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: name === 'totalAmount' ? Number(value) : value
        }));
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Add New Participant</h1>

                {success && (
                    <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                        Participant added successfully!
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                Full Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="mt-1 block w-full text-black border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Enter full name"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                id="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="mt-1 block w-full text-black border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Enter email address"
                            />
                        </div>

                        <div>
                            <label htmlFor="mobile" className="block text-sm font-medium text-gray-700">
                                Mobile Number
                            </label>
                            <input
                                type="tel"
                                name="mobile"
                                id="mobile"
                                value={formData.mobile}
                                onChange={handleChange}
                                className="mt-1 block w-full text-black border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Enter mobile number"
                            />
                        </div>

                        <div>
                            <label htmlFor="paymentId" className="block text-sm font-medium text-gray-700">
                                Payment ID
                            </label>
                            <input
                                type="text"
                                name="paymentId"
                                id="paymentId"
                                value={formData.paymentId}
                                onChange={handleChange}
                                className="mt-1 block w-full text-black border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Enter payment ID"
                            />
                        </div>

                        <div>
                            <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700">
                                Total Amount
                            </label>
                            <input
                                type="number"
                                name="totalAmount"
                                id="totalAmount"
                                value={formData.totalAmount}
                                onChange={handleChange}
                                min="0"
                                className="mt-1 block w-full text-black border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>

                        <div>
                            <label htmlFor="collegeName" className="block text-sm font-medium text-gray-700">
                                College Name
                            </label>
                            <input
                                type="text"
                                name="collegeName"
                                id="collegeName"
                                value={formData.collegeName}
                                onChange={handleChange}
                                className="mt-1 block w-full text-black border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Enter college name"
                            />
                        </div>


                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Adding...' : 'Add Participant'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase/config';
import ProtectedRoute from './components/ProtectedRoute';

interface DashboardStats {
  totalRegistrations: number;
  successfulRegistrations: number;
  failedRegistrations: number;
  pendingRegistrations: number;
}

interface RecentActivity {
  id: string;
  type: string;
  name: string;
  action: string;
  timestamp: Date;
}

function DashboardContent() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalRegistrations: 0,
    successfulRegistrations: 0,
    failedRegistrations: 0,
    pendingRegistrations: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const registrationsSnapshot = await getDocs(collection(db, 'registrations'));
      const successRegistrationsSnapshot = await getDocs(collection(db, 'successRegistrations'));
      const failedRegistrationsSnapshot = await getDocs(collection(db, 'failedRegistrations'));
      setStats({
        totalRegistrations: registrationsSnapshot.size + successRegistrationsSnapshot.size + failedRegistrationsSnapshot.size,
        successfulRegistrations: successRegistrationsSnapshot.size,
        failedRegistrations: failedRegistrationsSnapshot.size,
        pendingRegistrations: registrationsSnapshot.size,
      });

      const recentSuccessful = successRegistrationsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'Registration',
        name: doc.data().name,
        action: 'Verified',
        timestamp: new Date(doc.data().verifiedAt)
      }));

      const recentFailed = failedRegistrationsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'Registration',
        name: doc.data().name,
        action: 'Rejected',
        timestamp: new Date(doc.data().verifiedAt)
      }));

      // Combine and sort by timestamp
      const allActivities = [...recentSuccessful, ...recentFailed]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5);

      setRecentActivities(allActivities);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    try {
      localStorage.removeItem('admin_passkey');
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Overview of all registrations and submissions
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {/* Total Registrations */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden shadow-lg rounded-2xl text-white transform transition duration-300 hover:scale-105">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-indigo-100 truncate">Total Registrations</dt>
                  <dd className="text-3xl font-bold mt-1">{stats.totalRegistrations}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Successful Registrations */}
        <div className="bg-white overflow-hidden shadow-lg rounded-2xl border border-gray-100 transform transition duration-300 hover:scale-105">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-green-100 text-green-600 rounded-xl p-3">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Successful</dt>
                  <dd className="text-3xl font-bold text-gray-900 mt-1">{stats.successfulRegistrations}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-green-50/50 px-6 py-3 border-t border-green-100">
            <div className="text-sm">
              <span className="font-semibold text-green-700">
                {stats.totalRegistrations > 0 ? ((stats.successfulRegistrations / stats.totalRegistrations) * 100).toFixed(1) : 0}% success rate
              </span>
            </div>
          </div>
        </div>

        {/* Failed Registrations */}
        <div className="bg-white overflow-hidden shadow-lg rounded-2xl border border-gray-100 transform transition duration-300 hover:scale-105">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-rose-100 text-rose-600 rounded-xl p-3">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Failed</dt>
                  <dd className="text-3xl font-bold text-gray-900 mt-1">{stats.failedRegistrations}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-rose-50/50 px-6 py-3 border-t border-rose-100">
            <div className="text-sm">
              <span className="font-semibold text-rose-700">
                {stats.totalRegistrations > 0 ? ((stats.failedRegistrations / stats.totalRegistrations) * 100).toFixed(1) : 0}% rejection rate
              </span>
            </div>
          </div>
        </div>

        {/* Pending Registrations */}
        <div className="bg-white overflow-hidden shadow-lg rounded-2xl border border-gray-100 transform transition duration-300 hover:scale-105">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-amber-100 text-amber-600 rounded-xl p-3">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Review</dt>
                  <dd className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingRegistrations}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Recent Activity */}
      <div className="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-semibold leading-6 text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="px-6 py-5 hover:bg-gray-50 transition duration-150">
              <div className="flex items-center space-x-4">
                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${activity.action === 'Verified' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                  {activity.action === 'Verified' ? (
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {activity.name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {activity.type} was <span className={`font-medium ${activity.action === 'Verified' ? 'text-green-600' : 'text-red-600'}`}>{activity.action.toLowerCase()}</span>
                  </p>
                </div>
                <div className="text-sm text-gray-400 font-medium whitespace-nowrap">
                  {activity.timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {recentActivities.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              No recent activity found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

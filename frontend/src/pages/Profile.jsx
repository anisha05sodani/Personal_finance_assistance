import React, { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import toast from "react-hot-toast";

// Loading skeleton component
function Skeleton({ className }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}></div>
  );
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [userRes, statsRes] = await Promise.all([
          api.get("/users/me"),
          api.get("/stats/summary"),
        ]);
        setUser(userRes.data);
        setStats(statsRes.data);
      } catch (err) {
        setError("Failed to load profile info");
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account settings and preferences</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - User Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* User Profile Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                <div className="px-6 pb-6">
                  <div className="-mt-12 mb-4">
                    {loading ? (
                      <Skeleton className="w-24 h-24 rounded-2xl border-4 border-white dark:border-gray-800" />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-gray-800 shadow-lg">
                        {user?.email?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  {loading ? (
                    <div>
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : error ? (
                    <div className="text-red-600 dark:text-red-400">{error}</div>
                  ) : user && (
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {user.email?.split('@')[0] || 'User'}
                      </h2>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        {user.email}
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-sm text-gray-500 dark:text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Joined {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "-"}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <a
                    href="/dashboard"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Dashboard</span>
                  </a>
                  <a
                    href="/transactions"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Transactions</span>
                  </a>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <span className="font-medium text-red-600 dark:text-red-400">Logout</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Stats and Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Statistics Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Overview</h3>
                </div>
                <div className="p-6">
                  {loading ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                          <Skeleton className="h-4 w-24 mb-2" />
                          <Skeleton className="h-8 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : stats ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">Transactions</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.transaction_count || 0}</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-green-200 dark:bg-green-800 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">Total Income</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{(stats.total_income || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-red-200 dark:bg-red-800 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</span>
                        </div>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">₹{(stats.total_expenses || 0).toLocaleString()}</p>
                      </div>
                      <div className={`rounded-xl p-5 ${(stats.net_balance || 0) >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${(stats.net_balance || 0) >= 0 ? 'bg-blue-200 dark:bg-blue-800' : 'bg-orange-200 dark:bg-orange-800'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${(stats.net_balance || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">Net Balance</span>
                        </div>
                        <p className={`text-2xl font-bold ${(stats.net_balance || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          ₹{(stats.net_balance || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Account Settings Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Account Settings</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  <div className="px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Receive email alerts for transactions</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs font-medium">
                      Coming Soon
                    </span>
                  </div>
                  <div className="px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Change Password</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Update your account password</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs font-medium">
                      Coming Soon
                    </span>
                  </div>
                  <div className="px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Export Data</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Download all your financial data</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs font-medium">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h3>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Delete Account</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Permanently delete your account and all data</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => toast.error('Account deletion is disabled')}
                      className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 
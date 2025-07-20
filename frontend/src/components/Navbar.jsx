import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Navbar = () => {
  const [username, setUsername] = useState('');

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await api.get('/users/me');
        const email = res.data.email || '';
        const name = email.includes('@') ? email.split('@')[0] : email;
        setUsername(name || 'User');
      } catch {
        setUsername('User');
      }
    }
    fetchUser();
  }, []);

  return (
    <nav
      className="bg-gradient-to-r from-blue-800 to-blue-500 shadow-md rounded-xl flex items-center justify-between sticky top-0 z-50"
      style={{ margin: '0.5rem 1.5rem' }}
    >
      {/* Left: Logo and Brand */}
      <div className="flex items-center gap-3" style={{ paddingLeft: '0.5rem' }}>
        <img src="https://img.icons8.com/ios-filled/50/2563eb/wallet-app.png" alt="wallet" className="w-8 h-8 mr-2" />
        <span className="text-2xl font-bold text-white tracking-wide">FinTrackr</span>
      </div>
      {/* Center: Navigation Links */}
      <div
        className="flex items-center bg-red-400/20 rounded-md"
        style={{ gap: '4rem', padding: '0.5rem 1.5rem' }}
      >
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/transactions">Transactions</Link>
        <Link to="/categories">Categories</Link>
        <Link to="/upload">Upload</Link>
      </div>
      {/* Right: Profile Section */}
      <div className="flex flex-col items-end">
        <Link to="/profile" style={{ textDecoration: 'none' }}>
          <div
            className="flex items-center gap-3 bg-white/10 rounded-lg"
            style={{ padding: '0.5rem 1.25rem', marginRight: '0.5rem', cursor: 'pointer' }}
          >
            <img src="https://img.icons8.com/ios-filled/24/ffffff/user-male-circle.png" alt="profile" className="w-6 h-6" />
            <span className="text-white font-semibold">{username}</span>
          </div>
        </Link>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="mt-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar; 
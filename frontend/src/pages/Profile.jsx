import React, { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      try {
        const res = await api.get("/users/me");
        setUser(res.data);
      } catch (err) {
        setError("Failed to load user info");
      }
      setLoading(false);
    }
    fetchUser();
  }, []);

  return (
    <>
      <Navbar />
      <div className="flex flex-col min-h-screen w-full p-4 md:p-8 m-4 bg-gray-50 dark:bg-black transition-colors duration-300 items-center justify-center">
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <div className="p-8 bg-white dark:bg-gray-900 rounded shadow text-gray-900 dark:text-white w-full max-w-2xl mx-auto flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold mb-4 text-blue-700 dark:text-blue-300">User Profile</h2>
            {loading ? (
              <div>Loading...</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : user ? (
              <>
                <div className="mb-4 text-lg"><span className="font-semibold">Email:</span> {user.email}</div>
                <div className="mb-4 text-lg"><span className="font-semibold">Member since:</span> {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}</div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
} 
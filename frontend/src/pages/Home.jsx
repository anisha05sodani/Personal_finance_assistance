import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-100 via-blue-200 to-blue-400 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 transition-colors duration-300">
      <div className="flex items-center justify-center" style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <img src="https://img.icons8.com/ios-filled/50/2563eb/wallet-app.png" alt="wallet" className="w-10 h-10 mr-2" />
        <span className="text-3xl font-extrabold text-blue-700 dark:text-white tracking-wide">FinTrackr</span>
      </div>
      <div className="flex flex-row w-full max-w-5xl mx-auto mt-16 p-6 md:p-10 gap-8 items-start">
        {/* Left: Photo Box */}
        <div className="flex flex-col items-center justify-center bg-blue-50 dark:bg-gray-800 p-6 md:w-1/2 w-full rounded-2xl">
          <img
            src="https://images.pexels.com/photos/4386375/pexels-photo-4386375.jpeg?auto=compress&w=400"
            alt="Finance graph"
            className="rounded-2xl w-64 h-64 object-cover shadow-lg dark:border-gray-900"
          />
        </div>
        {/* Right: Content Box */}
        <div className="flex flex-col justify-center items-center md:items-start text-center md:text-left p-6 md:w-1/2 w-full">
          <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">Welcome to FinTrackr</h2>
          
          <p className="text-gray-700 dark:text-gray-200 mb-6 max-w-md">
          Your personal finance assistant that helps you log, manage, and understand your income and expenses with powerful insights, smart tracking, and seamless control over your financial journey.”
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center md:justify-start">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold shadow-md transition text-lg"
              onClick={() => navigate("/login")}
            >
              Log in
            </button>
            <button
              className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-8 py-3 rounded-full font-semibold shadow-md transition border border-blue-300 dark:bg-gray-800 dark:text-blue-200 dark:border-gray-600 text-lg"
              onClick={() => navigate("/register")}
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 
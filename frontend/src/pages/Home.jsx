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
    <div className="min-h-screen bg-blue-50 dark:bg-black flex items-center justify-center transition-colors duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg flex flex-col md:flex-row items-center p-8 md:p-16 w-full max-w-5xl relative overflow-hidden border-2 border-blue-200 dark:border-gray-800">
        {/* Decorative background shapes */}
        <div className="absolute left-0 top-0 w-1/2 h-full z-0">
          <div className="absolute rounded-full bg-blue-200 opacity-40 w-64 h-64 -top-24 -left-24 dark:bg-gray-800"></div>
          <div className="absolute rounded-full bg-blue-300 opacity-30 w-80 h-80 -bottom-32 -left-16 dark:bg-gray-700"></div>
          <div className="absolute rounded-2xl bg-blue-100 opacity-50 w-96 h-96 -top-16 -left-8 dark:bg-gray-900"></div>
        </div>
        {/* Image section */}
        <div className="relative z-10 flex-shrink-0 mb-8 md:mb-0 md:mr-12">
          <div className="bg-blue-100 dark:bg-gray-800 rounded-3xl p-2 border-2 border-blue-200 dark:border-gray-700">
            <img
              src="https://images.pexels.com/photos/4386375/pexels-photo-4386375.jpeg?auto=compress&w=400"
              alt="Finance graph"
              className="rounded-2xl w-64 h-64 object-cover shadow-lg border-4 border-white dark:border-gray-900"
            />
          </div>
        </div>
        {/* Text section */}
        <div className="relative z-10 flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start mb-2">
            <img src="https://img.icons8.com/ios-filled/50/2563eb/wallet-app.png" alt="wallet" className="w-8 h-8 mr-2" />
            <span className="text-2xl font-bold text-blue-700 dark:text-white">FinTrackr</span>
          </div>
          <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-1">Welcome to FinTrackr!</h2>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
            Your personal finance assistant that helps you log, manage, and understand your income and expenses with powerful insights, smart tracking, and seamless control over your financial journey.
          </h1>
          <div className="flex flex-col md:flex-row gap-4 justify-center md:justify-start mt-6">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-semibold shadow-md transition"
              onClick={() => navigate("/login")}
            >
              Log in
            </button>
            <button
              className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-6 py-2 rounded-full font-semibold shadow-md transition border border-blue-300 dark:bg-gray-800 dark:text-blue-200 dark:border-gray-600"
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
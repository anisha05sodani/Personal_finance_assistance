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
      {/* <div className="flex items-left " style={{ marginTop: '1rem', marginBottom: '2rem', marginLeft : '3rem' }}>
        <span className="text-3xl md:text-4xl font-extrabold text-blue-700 dark:text-white tracking-wide" style={{  marginLeft:"",marginTop: '10px'}}>FinTrackr</span>
      </div> */}
      <div
        className="flex flex-row md:flex-row gap-8 w-full max-w-5xl mx-auto mt-4 p-4 md:p-10 items-start"
        style={{ margin: '40px', overflow: 'hidden' }}
      >
        {/* Left: Photo Box */}
        <div className="flex flex-col items-center justify-center bg-blue-50 dark:bg-gray-800 p-4 md:p-6 md:w-1/2 w-full rounded-2xl mb-6 md:mb-0">
          <img
            src="https://images.unsplash.com/photo-1556740772-1a741367b93e?auto=format&fit=crop&w=800&q=80"
            alt="Finance workspace"
            className="rounded-2xl w-full h-56 md:h-96 object-cover shadow-lg dark:border-gray-900 mx-4 md:mx-8"
          />
        </div>
        {/* Right: Content Box */}
        <div className="flex flex-col justify-center items-center md:items-start text-center md:text-left p-4 md:p-6 md:w-1/2 w-full">
          <img src="https://img.icons8.com/ios-filled/50/2563eb/wallet-app.png" alt="wallet" className="w-10 h-10 mr-2" />
          <h2 className="text-lg md:text-xl font-semibold text-blue-700 dark:text-blue-300 mb-2">Welcome to FinTrackr</h2>
          <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
            Your personal finance assistant<br />for smart tracking and insights.
          </h1>
          <p className="text-gray-700 dark:text-gray-200 mb-6 max-w-md text-base md:text-lg">
            Log, manage, and understand your income and expenses with powerful insights, smart tracking, and seamless control over your financial journey.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center md:justify-start ">
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
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Logo = ({ className = "" }) => (
  <div className={`flex items-center gap-2.5 ${className}`}>
    <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    </div>
    <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">FinTrackr</span>
  </div>
);

const features = [
  {
    title: "Track Expenses",
    description: "Log income and expenses in seconds and see exactly where your money goes.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
  },
  {
    title: "Visual Insights",
    description: "Beautiful charts break down your spending by category and over time.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055zM20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    ),
  },
  {
    title: "Scan Receipts",
    description: "Upload a receipt or PDF and let AI extract the transaction details for you.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
  },
];

const stats = [
  { value: "10k+", label: "Active users" },
  { value: "₹2Cr+", label: "Tracked monthly" },
  { value: "4.9★", label: "Average rating" },
];

const Home = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/dashboard");
  }, [navigate]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => navigate("/login")}
              className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium shadow-sm transition-colors"
            >
              Get started
            </button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-medium mb-6">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              Smart finance management
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-[1.1] tracking-tight mb-6">
              Take control of your{" "}
              <span className="text-indigo-600 dark:text-indigo-400">financial future</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              Track expenses, set budgets, and understand your spending with a simple,
              intuitive personal finance assistant.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                onClick={() => navigate("/register")}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm shadow-indigo-500/20 transition-colors"
              >
                Start free today
              </button>
              <button
                onClick={() => navigate("/login")}
                className="px-6 py-3 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 rounded-xl font-semibold border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>

          {/* Dashboard preview card */}
          <div className="relative">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-black/30 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Net balance</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">₹16,500</p>
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-950/50 px-2.5 py-1 rounded-full">
                  +12.5%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Income</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">₹45,000</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expenses</p>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">₹28,500</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Monthly overview</h3>
                <span className="text-xs text-gray-400">This week</span>
              </div>
              <div className="flex items-end gap-2 h-28">
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} className="flex-1 bg-indigo-500/90 dark:bg-indigo-500 rounded-md" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-y border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-3 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-4">
            Everything you need to manage money
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Powerful, simple features designed to help you build better financial habits.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900 hover:shadow-lg transition-all"
            >
              <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {f.icon}
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="bg-indigo-600 rounded-3xl px-8 py-14 text-center relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              Ready to take control?
            </h2>
            <p className="text-indigo-100 text-lg mb-8">
              Create your free account and start tracking in under a minute.
            </p>
            <button
              onClick={() => navigate("/register")}
              className="px-8 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors shadow-sm"
            >
              Get started — it's free
            </button>
          </div>
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full" />
          <div className="absolute -bottom-16 -left-10 w-56 h-56 bg-white/10 rounded-full" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © 2026 FinTrackr. Built for smarter finances.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;

import React, { useEffect, useState } from "react";
import api from "../services/api";
import { Pie, Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  BarElement,
  Filler,
} from "chart.js";
import Navbar from "../components/Navbar";
import AIInsights from "../components/AIInsights";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  BarElement,
  Filler
);

// Loading skeleton component
function Skeleton({ className }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}></div>
  );
}

// Empty state component
function EmptyState({ message, icon }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8">
      {icon || (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )}
      <p className="text-gray-500 dark:text-gray-400 text-center text-sm">{message}</p>
    </div>
  );
}

// Stat card component
function StatCard({ title, value, icon, color, bgGradient, loading, trend }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="w-14 h-14 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ₹{value?.toLocaleString() || '0'}
          </p>
          {trend && (
            <p className={`text-xs mt-2 flex items-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              {Math.abs(trend)}% from last month
            </p>
          )}
        </div>
        <div className={`p-4 rounded-2xl ${bgGradient || color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [categoryData, setCategoryData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ total_income: 0, total_expenses: 0, net_balance: 0 });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [monthlyComparison, setMonthlyComparison] = useState(null);
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const now = new Date();
        const [catRes, timeRes, txRes, summaryRes, comparisonRes, budgetRes] = await Promise.all([
          api.get("/stats/category-summary"),
          api.get("/stats/expense-timeline"),
          api.get("/transactions", { params: { limit: 100 } }),
          api.get("/stats/summary"),
          api.get("/stats/monthly-comparison"),
          api.get("/budgets/", { params: { month: now.getMonth() + 1, year: now.getFullYear() } }),
        ]);
        setCategoryData(catRes.data);
        setTimelineData(timeRes.data);
        const txData = txRes.data.items || txRes.data || [];
        setTransactions(txData);
        setRecentTransactions(txData.slice(0, 5));
        setSummary(summaryRes.data);
        setMonthlyComparison(comparisonRes.data);
        setBudgets(budgetRes.data || []);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  const colors = {
    primary: ['#3b82f6', '#60a5fa', '#93c5fd'],
    success: ['#10b981', '#34d399', '#6ee7b7'],
    danger: ['#ef4444', '#f87171', '#fca5a5'],
    warning: ['#f59e0b', '#fbbf24', '#fcd34d'],
    purple: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
    pink: ['#ec4899', '#f472b6', '#f9a8d4'],
  };

  const categoryColors = [
    colors.primary[0], colors.danger[0], colors.success[0], 
    colors.warning[0], colors.purple[0], colors.pink[0],
    '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ];

  const doughnutData = {
    labels: categoryData.map((c) => c.category),
    datasets: [
      {
        data: categoryData.map((c) => c.total),
        backgroundColor: categoryColors,
        borderWidth: 0,
        cutout: '70%',
      },
    ],
  };

  // Pie chart for total expenses by category
  const expenseByCategory = (Array.isArray(transactions) ? transactions : []).reduce((acc, tx) => {
    if (tx.type === 'expense') {
      acc[tx.category] = (acc[tx.category] || 0) + Number(tx.amount);
    }
    return acc;
  }, {});

  const barData = {
    labels: Object.keys(expenseByCategory),
    datasets: [
      {
        label: 'Expenses',
        data: Object.values(expenseByCategory),
        backgroundColor: categoryColors,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const lineData = {
    labels: timelineData.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: "Expenses",
        data: timelineData.map((d) => d.total),
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: colors.primary[0],
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: colors.primary[0],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#fff',
        bodyColor: '#d1d5db',
        borderColor: 'rgba(75, 85, 99, 0.3)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af' },
      },
      y: {
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        beginAtZero: true,
        ticks: { color: '#9ca3af' },
      },
    },
  };

  // Monthly comparison (current vs previous month) grouped bar chart.
  const comparisonData = monthlyComparison
    ? {
        labels: ["Income", "Expenses"],
        datasets: [
          {
            label: "Previous Month",
            data: [
              monthlyComparison.previous_month.total_income,
              monthlyComparison.previous_month.total_expenses,
            ],
            backgroundColor: "#c4b5fd",
            borderRadius: 8,
            borderSkipped: false,
          },
          {
            label: "Current Month",
            data: [
              monthlyComparison.current_month.total_income,
              monthlyComparison.current_month.total_expenses,
            ],
            backgroundColor: "#6366f1",
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      }
    : null;

  const comparisonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', color: '#6b7280' },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#fff',
        bodyColor: '#d1d5db',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
      y: { grid: { color: 'rgba(156, 163, 175, 0.1)' }, beginAtZero: true, ticks: { color: '#9ca3af' } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'bottom', 
        labels: { 
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
          color: '#6b7280',
        } 
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#fff',
        bodyColor: '#d1d5db',
        padding: 12,
        cornerRadius: 8,
      }
    },
  };

  const getCategoryEmoji = (category) => {
    const map = {
      food: '🍔', rent: '🏠', utilities: '💡', transport: '🚗',
      entertainment: '🎬', shopping: '🛍️', health: '🏥', education: '📚',
      salary: '💰', freelance: '💻', investment: '📈', other: '📦',
    };
    return map[category?.toLowerCase()] || '📦';
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back! Here's your financial overview.</p>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Total Income"
              value={summary.total_income}
              loading={loading}
              bgGradient="bg-gradient-to-br from-green-400 to-emerald-600"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            />
            <StatCard
              title="Total Expenses"
              value={summary.total_expenses}
              loading={loading}
              bgGradient="bg-gradient-to-br from-red-400 to-rose-600"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              }
            />
            <StatCard
              title="Net Balance"
              value={summary.net_balance}
              loading={loading}
              bgGradient={summary.net_balance >= 0 ? "bg-gradient-to-br from-blue-400 to-indigo-600" : "bg-gradient-to-br from-orange-400 to-amber-600"}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Doughnut Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Expenses by Category</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {categoryData.length} categories
                </span>
              </div>
              <div className="h-64">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="w-48 h-48 rounded-full" />
                  </div>
                ) : categoryData.length > 0 ? (
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                ) : (
                  <EmptyState message="No transactions yet — add one to see insights." />
                )}
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Category Breakdown</h2>
              </div>
              <div className="h-64">
                {loading ? (
                  <div className="flex items-end justify-around h-full gap-2 pb-4">
                    <Skeleton className="w-8 h-32" />
                    <Skeleton className="w-8 h-48" />
                    <Skeleton className="w-8 h-24" />
                    <Skeleton className="w-8 h-40" />
                    <Skeleton className="w-8 h-36" />
                  </div>
                ) : Object.keys(expenseByCategory).length > 0 ? (
                  <Bar data={barData} options={chartOptions} />
                ) : (
                  <EmptyState message="No expense data to display." />
                )}
              </div>
            </div>

            {/* Line Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Spending Trend</h2>
              </div>
              <div className="h-64">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="w-full h-40" />
                  </div>
                ) : timelineData.length > 0 ? (
                  <Line data={lineData} options={chartOptions} />
                ) : (
                  <EmptyState message="No timeline data to display." />
                )}
              </div>
            </div>
          </div>

          {/* AI Insights + Monthly Comparison + Budgets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* AI Insights */}
            <AIInsights />

            {/* Monthly Comparison */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Comparison</h2>
                {monthlyComparison && (
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                      monthlyComparison.trend === "up"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        : monthlyComparison.trend === "down"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {monthlyComparison.trend === "up" ? "▲" : monthlyComparison.trend === "down" ? "▼" : "—"}
                    {Math.abs(monthlyComparison.expense_change_percentage)}% spend
                  </span>
                )}
              </div>
              <div className="h-64">
                {loading ? (
                  <div className="flex items-end justify-around h-full gap-2 pb-4">
                    <Skeleton className="w-10 h-40" />
                    <Skeleton className="w-10 h-28" />
                    <Skeleton className="w-10 h-48" />
                    <Skeleton className="w-10 h-36" />
                  </div>
                ) : comparisonData ? (
                  <Bar data={comparisonData} options={comparisonOptions} />
                ) : (
                  <EmptyState message="Not enough data to compare months." />
                )}
              </div>
            </div>

            {/* Budget Overview */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">This Month's Budgets</h2>
                <a href="/budgets" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  Manage →
                </a>
              </div>
              <div className="h-64 overflow-y-auto pr-1">
                {loading ? (
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i}>
                        <Skeleton className="h-3 w-24 mb-2" />
                        <Skeleton className="h-2.5 w-full" />
                      </div>
                    ))}
                  </div>
                ) : budgets.length > 0 ? (
                  <div className="space-y-4">
                    {budgets.map((b) => {
                      const pct = Math.min(b.percentage, 100);
                      const color = b.exceeded ? "bg-red-500" : b.percentage >= 80 ? "bg-amber-500" : "bg-green-500";
                      return (
                        <div key={b.id}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="capitalize text-gray-700 dark:text-gray-300">{b.category}</span>
                            <span className={`font-medium ${b.exceeded ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>
                              ₹{Number(b.spent).toLocaleString()} / ₹{Number(b.monthly_limit).toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState message="No budgets set for this month. Create one to track limits." />
                )}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
              <a href="/transactions" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View all →
              </a>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))
              ) : recentTransactions.length > 0 ? (
                recentTransactions.map((tx, idx) => (
                  <div key={tx.id || idx} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      tx.type === 'income' 
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {getCategoryEmoji(tx.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {tx.description || tx.category}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {tx.category} • {new Date(tx.date).toLocaleDateString()}
                      </p>
                    </div>
                    <p className={`font-semibold ${
                      tx.type === 'income' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}₹{Number(tx.amount).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="px-6 py-12">
                  <EmptyState message="No recent transactions. Start adding your expenses and income!" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 
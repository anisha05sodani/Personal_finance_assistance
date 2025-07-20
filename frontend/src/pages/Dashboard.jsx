import React, { useEffect, useState } from "react";
import api from "../services/api";
import { Pie, Line, Bar } from "react-chartjs-2";
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
} from "chart.js";
import Navbar from "../components/Navbar";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

export default function Dashboard() {
  const [categoryData, setCategoryData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const [catRes, timeRes, txRes] = await Promise.all([
          api.get("/stats/category-summary"),
          api.get("/stats/expense-timeline"),
          api.get("/transactions", { params: { type: 'expense', limit: 100 } }),
        ]);
        setCategoryData(catRes.data);
        setTimelineData(timeRes.data);
        setTransactions(txRes.data);
      } catch (err) {
        // handle error
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  const pieData = {
    labels: categoryData.map((c) => c.category),
    datasets: [
      {
        data: categoryData.map((c) => c.total),
        backgroundColor: [
          "#60a5fa",
          "#f87171",
          "#34d399",
          "#fbbf24",
          "#a78bfa",
          "#f472b6",
        ],
      },
    ],
  };

  const lineData = {
    labels: timelineData.map((d) => d.date),
    datasets: [
      {
        label: "Expenses",
        data: timelineData.map((d) => d.total),
        fill: false,
        borderColor: "#60a5fa",
        tension: 0.1,
      },
    ],
  };

  // Pie chart for transaction count by category
  const txCategoryCounts = transactions.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + 1;
    return acc;
  }, {});
  const txPieData = {
    labels: Object.keys(txCategoryCounts),
    datasets: [
      {
        data: Object.values(txCategoryCounts),
        backgroundColor: [
          "#60a5fa",
          "#f87171",
          "#34d399",
          "#fbbf24",
          "#a78bfa",
          "#f472b6",
          "#818cf8",
          "#facc15",
          "#fb7185",
          "#38bdf8",
          "#a3e635",
        ],
      },
    ],
  };

  // Pie chart for total expenses by category (like the screenshot)
  const expenseByCategory = transactions.reduce((acc, tx) => {
    if (tx.type === 'expense') {
      acc[tx.category] = (acc[tx.category] || 0) + Number(tx.amount);
    }
    return acc;
  }, {});
  const expensePieData = {
    labels: Object.keys(expenseByCategory),
    datasets: [
      {
        data: Object.values(expenseByCategory),
        backgroundColor: [
          "#60a5fa",
          "#f87171",
          "#34d399",
          "#fbbf24",
          "#a78bfa",
          "#f472b6",
          "#818cf8",
          "#facc15",
          "#fb7185",
          "#38bdf8",
          "#a3e635",
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  // Line chart options for modern look
  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    elements: {
      line: { tension: 0.4, borderWidth: 4 },
      point: { radius: 5, backgroundColor: '#60a5fa', borderColor: '#fff', borderWidth: 2 },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#e5e7eb' }, beginAtZero: true },
    },
  };

  // Bar chart for total expenses by category
  const barData = {
    labels: Object.keys(expenseByCategory),
    datasets: [
      {
        label: 'Expenses by Category',
        data: Object.values(expenseByCategory),
        backgroundColor: [
          "#60a5fa",
          "#f87171",
          "#34d399",
          "#fbbf24",
          "#a78bfa",
          "#f472b6",
          "#818cf8",
          "#facc15",
          "#fb7185",
          "#38bdf8",
          "#a3e635",
        ],
        borderRadius: 6,
      },
    ],
  };
  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#e5e7eb' }, beginAtZero: true },
    },
  };

  return (
    <>
      <Navbar />
      <div className="flex flex-col min-h-screen w-full p-4 md:p-8 m-4 bg-white text-black transition-colors duration-300 items-center justify-center">
        <h1 className="text-2xl font-bold mb-6 text-blue-700 text-center">Dashboard</h1>
        <div className="flex-1 flex flex-col md:flex-row gap-8 w-full h-full items-center justify-center">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-700">Loading...</div>
          ) : (
            <>
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="bg-white p-6 rounded shadow flex flex-col items-center w-full max-w-xl border border-gray-200">
                  <h2 className="text-lg font-semibold mb-4 text-blue-700 text-center">Expenses by Category</h2>
                  <div className="flex-1 flex items-center justify-center w-full">
                    <Pie data={pieData} />
                  </div>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="bg-white p-6 rounded shadow flex flex-col items-center w-full max-w-xl border border-gray-200 mb-8">
                  <h2 className="text-lg font-semibold mb-4 text-blue-700 text-center">Expenses by Category (Pie)</h2>
                  <div className="flex-1 flex flex-col items-center justify-center w-full">
                    {Object.keys(expenseByCategory).length > 0 ? (
                      <>
                        <Pie data={expensePieData} />
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                          {Object.keys(expenseByCategory).map((cat, idx) => (
                            <div key={cat} className="flex items-center gap-2">
                              <span style={{ backgroundColor: expensePieData.datasets[0].backgroundColor[idx], width: 16, height: 16, display: 'inline-block', borderRadius: 4 }}></span>
                              <span className="text-sm text-gray-700">{cat}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-400 text-center py-8">No expense data to display.</div>
                    )}
                  </div>
                </div>
                <div className="bg-white p-6 rounded shadow flex flex-col items-center w-full max-w-xl border border-gray-200 mb-8">
                  <h2 className="text-lg font-semibold mb-4 text-blue-700 text-center">Expenses by Category (Bar)</h2>
                  <div className="flex-1 flex items-center justify-center w-full">
                    {Object.keys(expenseByCategory).length > 0 ? (
                      <Bar data={barData} options={barOptions} />
                    ) : (
                      <div className="text-gray-400 text-center py-8">No expense data to display.</div>
                    )}
                  </div>
                </div>
                <div className="bg-white p-6 rounded shadow flex flex-col items-center w-full max-w-xl border border-gray-200">
                  <h2 className="text-lg font-semibold mb-4 text-blue-700 text-center">Expenses Over Time</h2>
                  <div className="flex-1 flex items-center justify-center w-full">
                    {lineData.labels.length > 0 ? (
                      <Line data={lineData} options={lineOptions} />
                    ) : (
                      <div className="text-gray-400 text-center py-8">No timeline data to display.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
} 
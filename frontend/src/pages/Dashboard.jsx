import React, { useEffect, useState } from "react";
import api from "../services/api";
import { Pie, Line } from "react-chartjs-2";
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

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const [catRes, timeRes] = await Promise.all([
          api.get("/stats/category-summary"),
          api.get("/stats/expense-timeline"),
        ]);
        setCategoryData(catRes.data);
        setTimelineData(timeRes.data);
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

  return (
    <>
      <Navbar />
      <div className="flex flex-col min-h-screen w-full p-4 md:p-8 bg-white text-black transition-colors duration-300">
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
                <div className="bg-white p-6 rounded shadow flex flex-col items-center w-full max-w-xl border border-gray-200">
                  <h2 className="text-lg font-semibold mb-4 text-blue-700 text-center">Expenses Over Time</h2>
                  <div className="flex-1 flex items-center justify-center w-full">
                    <Line data={lineData} />
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
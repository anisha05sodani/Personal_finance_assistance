import React, { useCallback, useEffect, useState } from "react";
import api from "../services/api";

export default function AIInsights() {
  const [insights, setInsights] = useState([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/ai/insights");
      setInsights(res.data.insights || []);
      setSource(res.data.source || "");
    } catch {
      setError("Couldn't load insights right now. Try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Insights</h2>
            {source === "fallback" && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">Offline mode (rule-based)</p>
            )}
          </div>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="p-2 rounded-lg text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition disabled:opacity-50"
          title="Refresh insights"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="animate-pulse w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="animate-pulse h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="animate-pulse h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
          <button
            onClick={fetchInsights}
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            Retry
          </button>
        </div>
      ) : insights.length > 0 ? (
        <ul className="space-y-3">
          {insights.map((text, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="mt-0.5 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{text}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No insights available yet.</p>
      )}
    </div>
  );
}

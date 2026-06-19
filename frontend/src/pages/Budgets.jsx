import React, { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import toast from "react-hot-toast";
import confirmToast from "../utils/confirmToast";

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}></div>;
}

const CATEGORY_OPTIONS = [
  "food", "groceries", "transport", "shopping", "utilities",
  "rent", "entertainment", "health", "travel", "education", "others",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getCategoryEmoji = (category) => {
  const map = {
    food: "🍔", groceries: "🛒", rent: "🏠", utilities: "💡", transport: "🚗",
    entertainment: "🎬", shopping: "🛍️", health: "🏥", education: "📚",
    travel: "✈️", others: "📦",
  };
  return map[category?.toLowerCase()] || "📦";
};

const emptyForm = () => {
  const now = new Date();
  return { category: "food", monthly_limit: "", month: now.getMonth() + 1, year: now.getFullYear() };
};

export default function Budgets() {
  const now = new Date();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/budgets/", { params: { month, year } });
      setBudgets(res.data);
    } catch {
      toast.error("Failed to load budgets");
    }
    setLoading(false);
  }, [month, year]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const openAdd = () => {
    setEditId(null);
    setForm({ ...emptyForm(), month, year });
    setModalOpen(true);
  };

  const openEdit = (b) => {
    setEditId(b.id);
    setForm({ category: b.category, monthly_limit: b.monthly_limit, month: b.month, year: b.year });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.monthly_limit || Number(form.monthly_limit) <= 0) {
      toast.error("Enter a limit greater than zero");
      return;
    }
    setSaving(true);
    const payload = {
      category: form.category,
      monthly_limit: parseFloat(form.monthly_limit),
      month: Number(form.month),
      year: Number(form.year),
    };
    try {
      if (editId) {
        await api.put(`/budgets/${editId}`, payload);
        toast.success("Budget updated");
      } else {
        await api.post("/budgets/", payload);
        toast.success("Budget created");
      }
      setModalOpen(false);
      fetchBudgets();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save budget");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    const ok = await confirmToast("Delete this budget?");
    if (!ok) return;
    try {
      await api.delete(`/budgets/${id}`);
      toast.success("Budget deleted");
      fetchBudgets();
    } catch {
      toast.error("Failed to delete budget");
    }
  };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const barColor = (pct, exceeded) => {
    if (exceeded) return "bg-red-500";
    if (pct >= 80) return "bg-amber-500";
    return "bg-green-500";
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budgets</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Set monthly limits and track your spending</p>
            </div>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-medium shadow-lg shadow-blue-500/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Budget
            </button>
          </div>

          {/* Period selectors */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Budget cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                  <Skeleton className="h-5 w-32 mb-4" />
                  <Skeleton className="h-3 w-full mb-3" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : budgets.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No budgets for {MONTHS[month - 1]} {year}</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Create a budget to start tracking your spending limits.</p>
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Budget
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {budgets.map((b) => {
                const pct = Math.min(b.percentage, 100);
                return (
                  <div key={b.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl">
                          {getCategoryEmoji(b.category)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white capitalize">{b.category}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{MONTHS[b.month - 1]} {b.year}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(b)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all ${barColor(b.percentage, b.exceeded)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">
                        ₹{Number(b.spent).toLocaleString()} <span className="text-gray-400">/ ₹{Number(b.monthly_limit).toLocaleString()}</span>
                      </span>
                      <span className={`font-semibold ${b.exceeded ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-200"}`}>
                        {b.percentage}%
                      </span>
                    </div>
                    <p className={`text-xs mt-2 ${b.exceeded ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                      {b.exceeded
                        ? `Over by ₹${Math.abs(b.remaining).toLocaleString()}`
                        : `₹${Number(b.remaining).toLocaleString()} remaining`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalOpen(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSave}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editId ? "Edit Budget" : "Add Budget"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Monthly Limit (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monthly_limit}
                  onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })}
                  placeholder="e.g. 5000"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Month</label>
                  <select
                    value={form.month}
                    onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Year</label>
                  <select
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : editId ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

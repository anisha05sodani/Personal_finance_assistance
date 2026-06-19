import React, { useEffect, useState } from "react";
import api from "../services/api";
import TransactionModal from "../components/TransactionModal";
import Navbar from "../components/Navbar";
import toast from "react-hot-toast";
import confirmToast from "../utils/confirmToast";
import { exportTransactionsToCsv } from "../utils/exportCsv";

// Loading skeleton component
function Skeleton({ className }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}></div>
  );
}

const getCategoryEmoji = (category) => {
  const map = {
    food: '🍔', rent: '🏠', utilities: '💡', transport: '🚗',
    entertainment: '🎬', shopping: '🛍️', health: '🏥', education: '📚',
    salary: '💰', freelance: '💻', investment: '📈', travel: '✈️',
    others: '📦', other: '📦',
  };
  return map[category?.toLowerCase()] || '📦';
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Filter state
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      setCategories(res.data);
    } catch {}
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (type) params.type = type;
      if (category) params.category = category;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (search) params.search = search;
      params.skip = (page - 1) * limit;
      params.limit = limit;
      const res = await api.get("/transactions", { params });
      setTransactions(res.data.items || res.data);
      setTotalPages(res.data.total_pages || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError("Failed to load transactions");
      toast.error("Failed to load transactions");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Debounce the search input (300ms) before triggering a fetch.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line
  }, [type, category, startDate, endDate, page, search]);

  const handleAdd = () => {
    setEditTx(null);
    setModalOpen(true);
  };

  const handleEdit = (tx) => {
    setEditTx(tx);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmToast("Delete this transaction?");
    if (!confirmed) return;
    try {
      await api.delete(`/transactions/${id}`);
      toast.success("Transaction deleted");
      fetchTransactions();
    } catch {
      toast.error("Failed to delete transaction");
    }
  };

  const handleSave = async (form) => {
    try {
      if (editTx) {
        await api.put(`/transactions/${editTx.id}`, {
          ...form,
          amount: parseFloat(form.amount),
        });
        toast.success("Transaction updated");
      } else {
        await api.post("/transactions", {
          ...form,
          amount: parseFloat(form.amount),
        });
        toast.success("Transaction created");
      }
      setModalOpen(false);
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save transaction");
    }
  };

  const clearFilters = () => {
    setType("");
    setCategory("");
    setStartDate("");
    setEndDate("");
    setSearch("");
    setSearchInput("");
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (type) params.type = type;
      if (category) params.category = category;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (search) params.search = search;
      params.skip = 0;
      params.limit = 10000;
      const res = await api.get("/transactions", { params });
      const items = res.data.items || res.data || [];
      if (items.length === 0) {
        toast.error("No transactions to export");
        return;
      }
      exportTransactionsToCsv(items);
      toast.success(`Exported ${items.length} transaction${items.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Failed to export transactions");
    } finally {
      setExporting(false);
    }
  };

  const hasActiveFilters = type || category || startDate || endDate || search;

  // Merge the user's custom categories with built-in defaults for the filter dropdown.
  const defaultCategories = [
    "education", "food", "rent", "utilities", "entertainment",
    "shopping", "health", "travel", "salary", "investment", "others",
  ];
  const categoryFilterOptions = [
    ...new Set([
      ...categories.map((c) => c.name.toLowerCase()),
      ...defaultCategories,
    ]),
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your income and expenses</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-5 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium disabled:opacity-50"
                title="Export to CSV"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {exporting ? "Exporting..." : "Export CSV"}
              </button>
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-medium shadow-lg shadow-blue-500/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Transaction
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by description, category, or amount..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border transition ${
                    showFilters || hasActiveFilters
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters
                  {hasActiveFilters && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">Active</span>
                  )}
                </button>
              </div>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Type</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                      value={type}
                      onChange={(e) => { setType(e.target.value); setPage(1); }}
                    >
                      <option value="">All Types</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Category</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                      value={category}
                      onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                    >
                      <option value="">All Categories</option>
                      {categoryFilterOptions.map((name) => (
                        <option key={name} value={name}>
                          {name.charAt(0).toUpperCase() + name.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Start Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                      value={startDate}
                      onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">End Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                      value={endDate}
                      onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                    />
                  </div>
                </div>
                {hasActiveFilters && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={clearFilters}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transactions List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No transactions found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {hasActiveFilters 
                    ? "Try adjusting your filters to find what you're looking for."
                    : "Get started by adding your first transaction."}
                </p>
                {!hasActiveFilters && (
                  <button
                    onClick={handleAdd}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Transaction
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transaction</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                                tx.type === 'income' 
                                  ? 'bg-green-100 dark:bg-green-900/30' 
                                  : 'bg-red-100 dark:bg-red-900/30'
                              }`}>
                                {getCategoryEmoji(tx.category)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {tx.description || tx.category}
                                </p>
                                <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ${
                                  tx.type === 'income' 
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                }`}>
                                  {tx.type}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-700 dark:text-gray-300 capitalize">{tx.category}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-500 dark:text-gray-400">
                              {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-semibold ${
                              tx.type === 'income' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {tx.type === 'income' ? '+' : '-'}₹{Number(tx.amount).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(tx)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                                title="Edit"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(tx.id)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                          tx.type === 'income' 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {getCategoryEmoji(tx.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {tx.description || tx.category}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {tx.category} • {new Date(tx.date).toLocaleDateString()}
                              </p>
                            </div>
                            <p className={`font-semibold whitespace-nowrap ${
                              tx.type === 'income' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {tx.type === 'income' ? '+' : '-'}₹{Number(tx.amount).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ${
                              tx.type === 'income' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                                : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                            }`}>
                              {tx.type}
                            </span>
                            <div className="flex-1"></div>
                            <button
                              onClick={() => handleEdit(tx)}
                              className="p-2 text-gray-500 hover:text-blue-600 rounded-lg transition"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="p-2 text-gray-500 hover:text-red-600 rounded-lg transition"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {!loading && transactions.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing <span className="font-medium">{((page - 1) * limit) + 1}</span> - <span className="font-medium">{Math.min(page * limit, total)}</span> of <span className="font-medium">{total}</span> transactions
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm font-medium"
                  >
                    Next
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        <TransactionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          categories={categories}
          initialData={editTx}
        />
      </div>
    </>
  );
} 
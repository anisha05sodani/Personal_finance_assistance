import React, { useState, useEffect } from "react";

const getCategoryEmoji = (category) => {
  const map = {
    food: '🍔', rent: '🏠', utilities: '💡', transport: '🚗',
    entertainment: '🎬', shopping: '🛍️', health: '🏥', education: '📚',
    salary: '💰', freelance: '💻', investment: '📈', travel: '✈️',
    others: '📦', other: '📦',
  };
  return map[category?.toLowerCase()] || '📦';
};

export default function TransactionModal({ open, onClose, onSave, categories, initialData }) {
  const [form, setForm] = useState({
    date: "",
    type: "expense",
    category: "",
    amount: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        date: initialData.date || "",
        type: initialData.type || "expense",
        category: initialData.category || "",
        amount: initialData.amount || "",
        description: initialData.description || "",
      });
    } else {
      setForm({ date: "", type: "expense", category: "", amount: "", description: "" });
    }
  }, [initialData, open]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(form);
    setLoading(false);
  };

  if (!open) return null;

  // Built-in defaults so the form works out-of-the-box, merged with the
  // user's custom categories (from the Categories page / `categories` prop).
  const defaultCategories = [
    'education', 'food', 'rent', 'utilities', 'entertainment',
    'shopping', 'health', 'travel', 'salary', 'investment', 'others',
  ];
  const customNames = (categories || []).map((c) => c.name.toLowerCase());
  const categoryOptions = [...new Set([...customNames, ...defaultCategories])].map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
    emoji: getCategoryEmoji(value),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              form.type === 'income' 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : 'bg-red-100 dark:bg-red-900/30'
            }`}>
              {form.category ? getCategoryEmoji(form.category) : (
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${form.type === 'income' ? 'text-green-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {initialData ? "Edit" : "New"} Transaction
            </h2>
          </div>
          <button
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            onClick={onClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'expense' })}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition ${
                  form.type === 'expense'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 ring-2 ring-red-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                Expense
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'income' })}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition ${
                  form.type === 'income'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 ring-2 ring-green-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Income
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
              <input
                type="number"
                name="amount"
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-lg font-semibold"
                value={form.amount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              name="category"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              value={form.category}
              onChange={handleChange}
              required
            >
              <option value="">Select a category</option>
              {categoryOptions.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              name="date"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              name="description"
              placeholder="What was this for?"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              value={form.description}
              onChange={handleChange}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-3 rounded-xl text-white font-medium transition flex items-center justify-center gap-2 ${
                form.type === 'income'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
              } disabled:opacity-50`}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {initialData ? 'Update' : 'Save'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
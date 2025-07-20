import React, { useState, useEffect } from "react";

export default function TransactionModal({ open, onClose, onSave, categories, initialData }) {
  const [form, setForm] = useState({
    date: "",
    type: "expense",
    category_id: "",
    amount: "",
    description: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        date: initialData.date || "",
        type: initialData.type || "expense",
        category_id: initialData.category_id || "",
        amount: initialData.amount || "",
        description: initialData.description || "",
      });
    } else {
      setForm({ date: "", type: "expense", category_id: "", amount: "", description: "" });
    }
  }, [initialData, open]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-full max-w-md relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4">{initialData ? "Edit" : "Add"} Transaction</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Date</label>
            <input
              type="date"
              name="date"
              className="w-full border rounded px-3 py-2"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Type</label>
            <select
              name="type"
              className="w-full border rounded px-3 py-2"
              value={form.type}
              onChange={handleChange}
              required
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Category</label>
            <select
              name="category_id"
              className="w-full border rounded px-3 py-2"
              value={form.category_id}
              onChange={handleChange}
              required
            >
              <option value="">Select</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Amount</label>
            <input
              type="number"
              name="amount"
              className="w-full border rounded px-3 py-2"
              value={form.amount}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Description</label>
            <input
              type="text"
              name="description"
              className="w-full border rounded px-3 py-2"
              value={form.description}
              onChange={handleChange}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
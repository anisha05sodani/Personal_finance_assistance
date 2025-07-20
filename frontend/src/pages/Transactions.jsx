import React, { useEffect, useState } from "react";
import api from "../services/api";
import TransactionModal from "../components/TransactionModal";
import Navbar from "../components/Navbar";

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
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(10); // You can make this adjustable if desired
  const [totalPages, setTotalPages] = useState(1);

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
      if (category) params.category_id = category;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      params.page = page;
      params.limit = limit;
      const res = await api.get("/transactions", { params });
      setTransactions(res.data.items || res.data); // Support both paginated and non-paginated
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      setError("Failed to load transactions");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line
  }, [type, category, startDate, endDate, page]);

  const handleAdd = () => {
    setEditTx(null);
    setModalOpen(true);
  };

  const handleEdit = (tx) => {
    setEditTx(tx);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchTransactions();
    } catch {
      alert("Delete failed");
    }
  };

  const handleSave = async (form) => {
    try {
      if (editTx) {
        await api.put(`/transactions/${editTx.id}`, {
          ...form,
          amount: parseFloat(form.amount),
          category_id: parseInt(form.category_id),
        });
      } else {
        await api.post("/transactions", {
          ...form,
          amount: parseFloat(form.amount),
          category_id: parseInt(form.category_id),
        });
      }
      setModalOpen(false);
      fetchTransactions();
    } catch {
      alert("Save failed");
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex flex-col min-h-screen w-full p-4 md:p-8 bg-white text-black transition-colors duration-300 items-center justify-center">
        <div className="flex justify-between items-center mb-6 w-full max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-blue-700">Transactions</h1>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            onClick={handleAdd}
          >
            + Add Transaction
          </button>
        </div>
        {/* Filter controls */}
        <div className="flex flex-wrap gap-4 mb-4 items-end w-full max-w-5xl mx-auto items-center justify-center">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Type</label>
            <select
              className="border rounded px-2 py-1"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Category</label>
            <select
              className="border rounded px-2 py-1"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Start Date</label>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">End Date</label>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto items-center justify-center">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-700">Loading...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <div className="overflow-x-auto flex-1 w-full">
              <table className="min-w-full bg-white rounded shadow h-full mx-auto border border-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-gray-700">Date</th>
                    <th className="px-4 py-2 text-gray-700">Type</th>
                    <th className="px-4 py-2 text-gray-700">Category</th>
                    <th className="px-4 py-2 text-gray-700">Amount</th>
                    <th className="px-4 py-2 text-gray-700">Description</th>
                    <th className="px-4 py-2 text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-t border-gray-200">
                      <td className="px-4 py-2 text-black">{tx.date}</td>
                      <td className="px-4 py-2 text-black">{tx.type}</td>
                      <td className="px-4 py-2 text-black">{tx.category_name}</td>
                      <td className="px-4 py-2 text-black">{tx.amount}</td>
                      <td className="px-4 py-2 text-black">{tx.description}</td>
                      <td className="px-4 py-2">
                        <button
                          className="text-blue-600 hover:underline mr-2"
                          onClick={() => handleEdit(tx)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => handleDelete(tx.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Modal */}
          <TransactionModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onSave={handleSave}
            categories={categories}
            initialData={editTx}
          />
        </div>
      </div>
    </>
  );
} 
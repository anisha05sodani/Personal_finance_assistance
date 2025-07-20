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
      if (category) params.category = category;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      params.page = page;
      params.limit = limit;
      const res = await api.get("/transactions", { params: {type: 'expense', limit:100} });
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
        });
      } else {
        await api.post("/transactions", {
          ...form,
          amount: parseFloat(form.amount),
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
      <div className="flex bg-white text-black transition-colors justify-center m-4" >
        <div className="flex flex-col items-center " >
          <div><h1
            className=""
            style={{ marginTop: 0 }}
          >
            Transactions
          </h1>
          </div>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition "
            onClick={handleAdd}
            style={{ marginBottom: 10 }}
          >
            + Add Transaction
          </button>
          {/* Filter controls */}
          <div className="flex flex-wrap gap-4 mb-4 items-end w-full max-w-5xl mx-auto items-center justify-center">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Type</label>
              <select
                className="border rounded px-3 py-2 min-w-[120px]"
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
                className="border rounded px-3 py-2 min-w-[160px]"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All</option>
                <option value="education">Education</option>
                <option value="food">Food</option>
                <option value="rent">Rent</option>
                <option value="utilities">Utilities</option>
                <option value="entertainment">Entertainment</option>
                <option value="shopping">Shopping</option>
                <option value="health">Health</option>
                <option value="travel">Travel</option>
                <option value="salary">Salary</option>
                <option value="investment">Investment</option>
                <option value="others">Others</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Start Date</label>
              <input
                type="date"
                className="border rounded px-3 py-2 min-w-[140px]"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">End Date</label>
              <input
                type="date"
                className="border rounded px-3 py-2 min-w-[140px]"
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
                <table className="min-w-full bg-white rounded shadow h-full mx-auto border border-gray-400 text-center">
                  <thead>
                    <tr className="border-b-2 border-gray-500">
                      <th className="px-4 py-2 text-gray-700 border-r border-gray-300">Date</th>
                      <th className="px-4 py-2 text-gray-700 border-r border-gray-300">Type</th>
                      <th className="px-4 py-2 text-gray-700 border-r border-gray-300">Category</th>
                      <th className="px-4 py-2 text-gray-700 border-r border-gray-300">Amount</th>
                      <th className="px-4 py-2 text-gray-700 border-r border-gray-300">Description</th>
                      <th className="px-4 py-2 text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-400">
                    {transactions.map((tx, idx) => (
                      <tr key={tx.id} className={idx !== transactions.length - 1 ? 'border-b border-gray-400' : ''}>
                        <td className="px-4 py-2 text-black border-r border-gray-200">{tx.date}</td>
                        <td className="px-4 py-2 text-black border-r border-gray-200">{tx.type}</td>
                        <td className="px-4 py-2 text-black border-r border-gray-200">{tx.category}</td>
                        <td className="px-4 py-2 text-black border-r border-gray-200">{tx.amount}</td>
                        <td className="px-4 py-2 text-black border-r border-gray-200">{tx.description}</td>
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
      </div>
    </>
  );
} 
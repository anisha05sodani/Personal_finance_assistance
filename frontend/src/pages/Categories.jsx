import React, { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [name, setName] = useState("");

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get("/categories");
      setCategories(res.data);
    } catch {
      setError("Failed to load categories");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = () => {
    setEditCat(null);
    setName("");
    setModalOpen(true);
  };

  const handleEdit = (cat) => {
    setEditCat(cat);
    setName(cat.name);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch {
      alert("Delete failed");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editCat) {
        await api.put(`/categories/${editCat.id}`, { name });
      } else {
        await api.post("/categories", { name });
      }
      setModalOpen(false);
      fetchCategories();
    } catch {
      alert("Save failed");
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex flex-col min-h-screen w-full p-4 md:p-8 bg-white text-black transition-colors duration-300 items-center justify-center">
        <div className="flex justify-between items-center mb-6 w-full max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-blue-700">Categories</h1>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            onClick={handleAdd}
          >
            + Add Category
          </button>
        </div>
        <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto items-center justify-center">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-700">Loading...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <div className="overflow-x-auto flex-1 w-full">
              <table className="min-w-full bg-white rounded shadow h-full mx-auto border border-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-gray-700">Name</th>
                    <th className="px-4 py-2 text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id} className="border-t border-gray-200">
                      <td className="px-4 py-2 text-black">{cat.name}</td>
                      <td className="px-4 py-2">
                        <button
                          className="text-blue-600 hover:underline mr-2"
                          onClick={() => handleEdit(cat)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => handleDelete(cat.id)}
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
        </div>
      </div>
    </>
  );
} 
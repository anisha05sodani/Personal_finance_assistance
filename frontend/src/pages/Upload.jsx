import React, { useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import TransactionModal from "../components/TransactionModal";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [parsedTx, setParsedTx] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    setResult(null);
    setError("");
    setParsedTx(null);
    if (f && f.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async (type) => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError("");
    setParsedTx(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const endpoint = type === "pdf" ? "/upload/pdf" : "/upload/receipt";
      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data.data || res.data.text);
      // Try to extract transaction fields from result
      let tx = null;
      if (res.data && typeof res.data === "object") {
        const d = res.data.data || res.data;
        // Try to extract fields (customize as needed)
        tx = {
          date: d.date || "",
          type: d.type || "expense",
          category: d.category || "others",
          amount: d.amount || "",
          description: d.description || "",
        };
        // Only set if at least amount and date are present
        if (tx.amount && tx.date) setParsedTx(tx);
      }
    } catch (err) {
      setError("Failed to parse file");
    }
    setLoading(false);
  };

  const handleCreateTransaction = () => {
    setModalOpen(true);
  };

  const handleSave = async (form) => {
    try {
      await api.post("/transactions", {
        ...form,
        amount: parseFloat(form.amount),
      });
      setModalOpen(false);
      setParsedTx(null);
      setResult(null);
      setFile(null);
      setError("");
      alert("Transaction created!");
    } catch {
      alert("Save failed");
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex flex-col min-h-screen w-full p-4 md:p-8 m-4 bg-white text-black transition-colors duration-300 items-center justify-center">
        <h1 className="text-2xl font-bold mb-6 text-blue-700 text-center">Upload Receipt or PDF</h1>
        <div className="flex-1 flex flex-col w-full max-w-xl mx-auto items-center justify-center">
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileChange}
            className="mb-4 text-gray-700"
          />
          <div className="flex gap-4 mb-4 items-center justify-center w-full">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              onClick={() => handleUpload("pdf")}
              disabled={!file || loading}
            >
              Parse PDF
            </button>
            <button
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
              onClick={() => handleUpload("img")}
              disabled={!file || loading}
            >
              Parse Receipt Image
            </button>
          </div>
          {loading && <div className="text-gray-700">Processing...</div>}
          {error && <div className="text-red-600 mb-2">{error}</div>}
          {/* Image preview */}
          {previewUrl && (
            <div className="flex flex-col items-center mt-4">
              <span className="text-gray-500 text-xs mb-1">Receipt Preview</span>
              <img
                src={previewUrl}
                alt="Receipt Preview"
                className="max-h-64 rounded shadow border border-gray-200 object-contain"
                style={{ maxWidth: "100%" }}
              />
            </div>
          )}
          {result && (
            <div className="bg-white p-4 rounded shadow mt-4 flex-1 w-full mx-auto flex flex-col items-center justify-center border border-gray-200 overflow-x-auto">
              <h2 className="font-semibold mb-2 text-blue-700 text-center">Parsed Data</h2>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 text-center break-all">
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
              {parsedTx && (
                <button
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-semibold shadow-md transition"
                  onClick={handleCreateTransaction}
                >
                  Create Transaction
                </button>
              )}
            </div>
          )}
          <TransactionModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onSave={handleSave}
            categories={[]}
            initialData={parsedTx}
          />
        </div>
      </div>
    </>
  );
} 
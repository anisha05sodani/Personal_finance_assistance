import React, { useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError("");
  };

  const handleUpload = async (type) => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const endpoint = type === "pdf" ? "/upload/pdf" : "/upload/receipt";
      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data.data || res.data.text);
    } catch (err) {
      setError("Failed to parse file");
    }
    setLoading(false);
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
          {result && (
            <div className="bg-white p-4 rounded shadow mt-4 flex-1 w-full mx-auto flex flex-col items-center justify-center border border-gray-200">
              <h2 className="font-semibold mb-2 text-blue-700 text-center">Parsed Data</h2>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 text-center">
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 
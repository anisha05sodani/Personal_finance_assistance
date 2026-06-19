import React, { useState, useRef } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import TransactionModal from "../components/TransactionModal";
import toast from "react-hot-toast";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [parsedTx, setParsedTx] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [details, setDetails] = useState(null);
  const [rawText, setRawText] = useState("");
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) processFile(f);
  };

  const processFile = (f) => {
    setFile(f);
    setResult(null);
    setError("");
    setParsedTx(null);
    setDetails(null);
    setRawText("");
    if (f && f.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (type) => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError("");
    setParsedTx(null);
    setDetails(null);
    setRawText("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const endpoint = type === "pdf" ? "/upload/pdf" : "/upload/receipt";
      // Let axios set the multipart Content-Type (incl. the boundary) automatically.
      const res = await api.post(endpoint, formData);
      setResult(res.data.data || res.data.text);
      if (res.data && res.data.details) setDetails(res.data.details);
      if (res.data && res.data.text) setRawText(res.data.text);
      let tx = null;
      if (res.data && typeof res.data === "object") {
        const d = res.data.data || res.data;
        tx = {
          date: d.date || "",
          type: d.type || "expense",
          category: d.category || "others",
          amount: d.amount || "",
          description: d.description || "",
        };
        if (tx.amount && tx.date) {
          setParsedTx(tx);
          toast.success("Receipt parsed successfully!");
        } else {
          toast("Could not extract all fields. Please enter manually.", { icon: "⚠️" });
        }
      }
    } catch (err) {
      setError("Failed to parse file");
      toast.error("Failed to parse file");
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
      setPreviewUrl(null);
      setError("");
      setDetails(null);
      setRawText("");
      toast.success("Transaction created!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save transaction");
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError("");
    setParsedTx(null);
    setDetails(null);
    setRawText("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Receipt</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Scan receipts or PDFs to automatically extract transaction data
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div className="space-y-6">
              {/* Upload Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Upload File
                  </h2>
                  
                  {/* Drag & Drop Zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : file
                        ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      id="fileInput"
                      accept=".pdf,image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {file ? (
                      <div className="space-y-3">
                        <div className="w-16 h-16 mx-auto rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                          {file.type.startsWith("image/") ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={clearFile}
                          className="text-sm text-red-600 dark:text-red-400 hover:underline"
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="fileInput" className="cursor-pointer block">
                        <div className="w-16 h-16 mx-auto rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-gray-900 dark:text-white font-medium mb-1">
                          Drop your file here or click to browse
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Supports PDF and image files (JPG, PNG)
                        </p>
                      </label>
                    )}
                  </div>

                  {/* Action Button (auto-routes by file type) */}
                  <div className="mt-6">
                    <button
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-3 rounded-xl hover:from-emerald-600 hover:to-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleUpload(file && file.type === "application/pdf" ? "pdf" : "img")}
                      disabled={!file || loading}
                    >
                      {loading ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      {!file
                        ? "Select a file first"
                        : file.type === "application/pdf"
                        ? "Parse PDF"
                        : "Scan Receipt"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tips Card */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tips for better results
                </h3>
                <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  <li className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Ensure the receipt is well-lit and in focus
                  </li>
                  <li className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Capture the full receipt including the total
                  </li>
                  <li className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Avoid shadows and reflections on the image
                  </li>
                </ul>
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              {/* Image Preview */}
              {previewUrl && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="font-semibold text-gray-900 dark:text-white">Preview</h2>
                  </div>
                  <div className="p-6">
                    <img
                      src={previewUrl}
                      alt="Receipt Preview"
                      className="max-h-80 w-full object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 border border-red-100 dark:border-red-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-red-900 dark:text-red-100">Upload Failed</h3>
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt Details */}
              {details && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Receipt Details
                    </h2>
                  </div>
                  <div className="p-6 space-y-5">
                    {/* Summary grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {details.merchant && (
                        <div className="col-span-2">
                          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Merchant</p>
                          <p className="font-medium text-gray-900 dark:text-white">{details.merchant}</p>
                        </div>
                      )}
                      {details.date && (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Date</p>
                          <p className="font-medium text-gray-900 dark:text-white">{details.date}</p>
                        </div>
                      )}
                      {details.time && (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Time</p>
                          <p className="font-medium text-gray-900 dark:text-white">{details.time}</p>
                        </div>
                      )}
                      {details.payment_method && (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Payment</p>
                          <p className="font-medium text-gray-900 dark:text-white">{details.payment_method}</p>
                        </div>
                      )}
                    </div>

                    {/* Line items */}
                    {details.items && details.items.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Items</p>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                          {details.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between px-4 py-2 text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                              <span className="font-medium text-gray-900 dark:text-white tabular-nums">{item.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Totals */}
                    {(details.subtotal || details.tax || details.total) && (
                      <div className="space-y-1 border-t border-gray-100 dark:border-gray-700 pt-4 text-sm">
                        {details.subtotal && (
                          <div className="flex justify-between text-gray-600 dark:text-gray-400">
                            <span>Subtotal</span>
                            <span className="tabular-nums">{details.subtotal}</span>
                          </div>
                        )}
                        {details.tax && (
                          <div className="flex justify-between text-gray-600 dark:text-gray-400">
                            <span>Tax</span>
                            <span className="tabular-nums">{details.tax}</span>
                          </div>
                        )}
                        {details.total && (
                          <div className="flex justify-between text-base font-semibold text-gray-900 dark:text-white pt-1">
                            <span>Total</span>
                            <span className="tabular-nums">{details.total}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Raw OCR text */}
                    {rawText && (
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 select-none">
                          View raw extracted text
                        </summary>
                        <pre className="mt-3 whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl overflow-x-auto font-mono max-h-64">
                          {rawText}
                        </pre>
                      </details>
                    )}

                    <div className="space-y-3 pt-1">
                      <button
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-medium"
                        onClick={() => {
                          if (!parsedTx) {
                            setParsedTx({
                              date: details.date || "",
                              type: "expense",
                              category: "others",
                              amount: details.total || "",
                              description: details.merchant || "",
                            });
                          }
                          setModalOpen(true);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Transaction from Receipt
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Parsed Result */}
              {result && !details && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900 dark:text-white">Extracted Data</h2>
                    {parsedTx && (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Ready to save
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl overflow-x-auto font-mono">
                      {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
                    </pre>
                    
                    <div className="mt-6 space-y-3">
                      {parsedTx && (
                        <button
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-medium"
                          onClick={handleCreateTransaction}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Create Transaction
                        </button>
                      )}
                      <button
                        className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium"
                        onClick={() => { 
                          setParsedTx({ date: "", type: "expense", category: "others", amount: "", description: "" }); 
                          setModalOpen(true); 
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Enter Manually
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!result && !error && !previewUrl && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No file uploaded yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Upload a receipt or PDF to extract transaction data automatically
                  </p>
                </div>
              )}
            </div>
          </div>

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
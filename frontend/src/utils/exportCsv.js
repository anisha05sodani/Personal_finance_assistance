// Client-side CSV export for transactions.
// Produces a file named transactions_YYYY_MM_DD.csv.

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportTransactionsToCsv(transactions) {
  const headers = ["Date", "Type", "Category", "Description", "Amount"];
  const rows = (transactions || []).map((tx) => [
    tx.date || "",
    tx.type || "",
    tx.category || "",
    tx.description || "",
    tx.amount ?? "",
  ]);

  const lines = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");

  const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const filename = `transactions_${yyyy}_${mm}_${dd}.csv`;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

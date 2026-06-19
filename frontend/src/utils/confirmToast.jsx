import toast from "react-hot-toast";

/**
 * Show a user-friendly confirmation as a toast with Confirm / Cancel actions.
 * Resolves to `true` when confirmed and `false` otherwise.
 *
 * Usage:
 *   if (await confirmToast("Delete this item?")) { ... }
 */
export default function confirmToast(message, { confirmLabel = "Delete", cancelLabel = "Cancel" } = {}) {
  return new Promise((resolve) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-white">{message}</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  });
}

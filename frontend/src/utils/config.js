// Backend API base URL. Override per-environment with VITE_API_URL in a
// frontend/.env file (e.g. VITE_API_URL=http://localhost:8001). Defaults to
// the standard backend port so a fresh clone works out of the box.
export const URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
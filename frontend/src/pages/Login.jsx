import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import CenteredBox from "../components/CenteredBox";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);
      const res = await api.post("/auth/login", formData);
      localStorage.setItem("token", res.data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    }
  };

  return (
    <CenteredBox>
      <form
        onSubmit={handleSubmit}
        className="w-full"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-700 dark:text-blue-300">Sign In</h2>
        {error && <div className="mb-4 text-red-600 text-center dark:text-red-400">{error}</div>}
        <div className="mb-4">
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">Email</label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-800 dark:text-white dark:border-gray-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-800 dark:text-white dark:border-gray-700"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          Login
        </button>
        <div className="mt-4 text-center">
          <span className="text-gray-700 dark:text-gray-200">Don't have an account? </span>
          <Link to="/register" className="text-blue-600 hover:underline dark:text-blue-300">
            Register
          </Link>
        </div>
      </form>
    </CenteredBox>
  );
} 
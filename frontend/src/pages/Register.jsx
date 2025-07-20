import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import CenteredBox from "../components/CenteredBox";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      const res = await api.post("/auth/register", { email, password });
      // Auto-login after registration
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);
      const loginRes = await api.post("/auth/login", formData);
      localStorage.setItem("token", loginRes.data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    }
  };

  return (
    <CenteredBox>
      <form
        onSubmit={handleSubmit}
        className="w-full"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-700 dark:text-blue-300">Register</h2>
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
        <div className="mb-4">
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-800 dark:text-white dark:border-gray-700"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">Confirm Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-800 dark:text-white dark:border-gray-700"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          Register
        </button>
        <div className="mt-4 text-center">
          <span className="text-gray-700 dark:text-gray-200">Already have an account? </span>
          <Link to="/login" className="text-blue-600 hover:underline dark:text-blue-300">
            Login
          </Link>
        </div>
      </form>
    </CenteredBox>
  );
} 
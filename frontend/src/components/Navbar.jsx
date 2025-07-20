import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/transactions", label: "Transactions" },
  { to: "/categories", label: "Categories" },
  { to: "/upload", label: "Upload" },
  { to: "/profile", label: "Profile" },
];

export default function Navbar() {
  return (
    <nav className="w-full bg-white dark:bg-gray-900 border-b border-blue-100 dark:border-gray-800 px-4 py-2 flex justify-center shadow-sm sticky top-0 z-40">
      <div className="flex gap-4 md:gap-8">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-3 py-1 rounded font-medium transition-colors duration-200 hover:bg-blue-100 dark:hover:bg-gray-800 hover:text-blue-700 dark:hover:text-blue-300 ${
                isActive
                  ? "bg-blue-600 text-white dark:bg-blue-700 dark:text-white"
                  : "text-gray-700 dark:text-gray-200"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
} 
import React from "react";

export default function Profile() {
  return (
    <div className="flex flex-col min-h-screen w-full p-4 md:p-8 bg-gray-50 dark:bg-black transition-colors duration-300 items-center justify-center">
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="p-8 bg-white dark:bg-gray-900 rounded shadow text-gray-900 dark:text-white w-full max-w-2xl mx-auto flex flex-col items-center justify-center">
          User Profile Page
        </div>
      </div>
    </div>
  );
} 
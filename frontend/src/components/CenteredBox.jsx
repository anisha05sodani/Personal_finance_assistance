import React from "react";

/**
 * CenteredBox - A responsive, production-ready container for centering content (e.g., forms) in the viewport.
 * Usage:
 * <CenteredBox>
 *   ...your content...
 * </CenteredBox>
 */
const CenteredBox = ({ children, className = "" }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-black transition-colors duration-300 px-4">
    <div
      className={`w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl p-6 sm:p-8 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-blue-100 dark:border-gray-800 ${className}`}
    >
      {children}
    </div>
  </div>
);

export default CenteredBox; 
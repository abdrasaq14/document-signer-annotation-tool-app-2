import React from "react";
import { FaSpinner } from "react-icons/fa";

const LoadingScreen = () => (
  <div className="h-screen bg-gray-100 flex items-center justify-center flex-col">
    <div className="bg-white p-8 rounded-lg shadow-lg flex flex-col items-center">
      <FaSpinner className="animate-spin text-blue-600 text-4xl mb-4" />
      <p className="text-lg font-semibold">Loading your document...</p>
      <p className="text-gray-500 mt-2">
        This may take a moment depending on file size
      </p>
    </div>
  </div>
);

export default LoadingScreen;

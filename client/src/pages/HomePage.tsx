import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.tsx";
import apiClient from "../api/index.ts";

// Simple SVG icons for the cards
const ProductIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-12 w-12 text-indigo-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
    />
  </svg>
);

const MaterialIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-12 w-12 text-indigo-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </svg>
);

const HomePage: React.FC = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
      // Force logout on client even if API call fails
      setUser(null);
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm fixed top-0 w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-indigo-600">
                  AutoCost Dashboard
                </h1>
              </div>
            </div>
            <div className="flex items-center">
              <span className="hidden sm:block text-sm text-gray-600 mr-4">
                Welcome, {user?.firstName}!
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Manage Your Business
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Select an option below to manage your products or raw materials.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Manage Products Card */}
            <Link to="/products" className="group block">
              <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out h-full flex flex-col items-center text-center">
                <div className="bg-indigo-100 p-4 rounded-full">
                  <ProductIcon />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-gray-900">
                  Manage Products
                </h3>
                <p className="mt-2 text-gray-600">
                  View, add, and manage your product catalog. Costs are
                  automatically updated when raw material prices change.
                </p>
                <span className="mt-6 font-semibold text-indigo-600 group-hover:underline">
                  Go to Products &rarr;
                </span>
              </div>
            </Link>

            {/* Manage Raw Materials Card */}
            <Link to="/raw-materials" className="group block">
              <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out h-full flex flex-col items-center text-center">
                <div className="bg-indigo-100 p-4 rounded-full">
                  <MaterialIcon />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-gray-900">
                  Manage Raw Materials
                </h3>
                <p className="mt-2 text-gray-600">
                  View, add, and update the costs of your ingredients. Changes
                  here will reflect across all relevant products.
                </p>
                <span className="mt-6 font-semibold text-indigo-600 group-hover:underline">
                  Go to Raw Materials &rarr;
                </span>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;

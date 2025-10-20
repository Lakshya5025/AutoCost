import React from "react";
import { useAuth } from "../contexts/AuthContext";

const HomePage: React.FC = () => {
  const { user, setUser } = useAuth();

  const handleLogout = () => {
    // In a real app, you would call a /api/auth/logout endpoint
    // that clears the session on the backend.
    setUser(null);
    // Navigate to login page is handled by ProtectedRoute
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-indigo-600">
                  Pricing App
                </h1>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-4">
                Welcome, {user?.firstName}!
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
              <p className="mt-4 text-gray-600">
                This is the main dashboard. From here, you will be able to
                manage your raw materials and products.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;

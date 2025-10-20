import { Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import apiClient from "./api"; // Ensure you have this import

import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import RawMaterialsPage from "./pages/RawMaterialsPage";
import ProductsPage from "./pages/ProductsPage";
import ProtectedRoute from "./components/ProtectedRoute";

// A wrapper component to handle auth logic cleanly
function AuthWrapper({ children }: { children: JSX.Element }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  // Define a logout function that can be passed down or used in context
  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
      // Even if API fails, force logout on client
      setUser(null);
      navigate("/login");
    }
  };

  // You can pass handleLogout via a modified AuthContext if needed,
  // but for now, we'll build the UI assuming it's available.
  // We'll add it to the HomePage directly for simplicity.
  return children;
}

function App() {
  return (
    <AuthProvider>
      <AuthWrapper>
        <>
          {/* Toaster is for showing nice notifications */}
          <Toaster position="top-center" reverseOrder={false} />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes: Only accessible when logged in */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/raw-materials"
              element={
                <ProtectedRoute>
                  <RawMaterialsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <ProductsPage />
                </ProtectedRoute>
              }
            />

            {/* Add a catch-all route for 404 Not Found if desired */}
            <Route
              path="*"
              element={
                <div className="flex justify-center items-center h-screen">
                  <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
                </div>
              }
            />
          </Routes>
        </>
      </AuthWrapper>
    </AuthProvider>
  );
}

export default App;

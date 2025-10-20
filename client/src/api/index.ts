import axios from "axios";

// Create an Axios instance
const apiClient = axios.create({
  // Use the environment variable for the backend URL.
  // The VITE_ prefix is required for Vite to expose it to the client.
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true, // Crucial for sending/receiving session cookies
});

// Add a response interceptor to handle potential 401 Unauthorized errors
// This could happen if the session expires or is invalid
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If we get a 401, it means the user is not authenticated or session expired.
      // We can clear the user state and potentially redirect to login.
      // For now, we just log it, but AuthContext might handle redirection later.
      console.error("Unauthorized request - potentially redirecting to login.");
      // You might want to clear user state here using a method provided by AuthContext
      // e.g., authContext.logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;

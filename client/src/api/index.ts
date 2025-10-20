import axios from "axios";

// Create an Axios instance
const apiClient = axios.create({
  // Use the environment variable for the backend URL.
  // The VITE_ prefix is required for Vite to expose it to the client.
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true, // This is crucial for sending cookies with requests
});

export default apiClient;

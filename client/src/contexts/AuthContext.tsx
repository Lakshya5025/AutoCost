import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import apiClient from "../api/index.ts";

// Define a more specific User type
type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for an active session on initial load
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const response = await apiClient.get("/auth/me");
        if (response.data && response.data.user) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.log("No active session found.");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkUserSession();
  }, []);

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.error("Logout API call failed", error);
    } finally {
      // Always clear user state on the client
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

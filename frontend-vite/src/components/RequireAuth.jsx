import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { apiRequest, clearSession } from "../utils/api.js";

const RequireAuth = ({ children }) => {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const validate = async () => {
      const token = window.localStorage.getItem("accessToken");
      const refreshToken = window.localStorage.getItem("refreshToken");
      if (!token || !refreshToken) {
        setAllowed(false);
        setChecking(false);
        return;
      }
      try {
        const data = await apiRequest("/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refreshToken })
        });
        window.localStorage.setItem("accessToken", data.accessToken);
        setAllowed(true);
      } catch (err) {
        clearSession();
        setAllowed(false);
      } finally {
        setChecking(false);
      }
    };

    validate();
  }, []);

  if (checking) {
    return null;
  }

  if (!allowed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default RequireAuth;

import { Navigate } from "react-router-dom";
import { getCurrentRole } from "../utils/session.js";

const RequireRole = ({ roles, children }) => {
  const role = getCurrentRole();
  if (!role || !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default RequireRole;


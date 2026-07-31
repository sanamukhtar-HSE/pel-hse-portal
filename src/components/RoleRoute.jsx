import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

function RoleRoute({ allowedRoles, children }) {
  const { user, loading } = useUser();

  if (loading) {
    return <p>Checking permissions...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.user_type)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default RoleRoute;
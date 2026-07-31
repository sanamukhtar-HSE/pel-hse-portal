import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import IncidentForm from "./pages/IncidentForm";
import IncidentDetails from "./pages/IncidentDetails";
import IncidentList from "./pages/IncidentList";
import IncidentApproval from "./pages/IncidentApproval";
import Investigation from "./pages/Investigation";
import ActionTracker from "./pages/ActionTracker";
import Reports from "./pages/Reports";
import Login from "./pages/Login";

import { UserProvider } from "./context/UserContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/incident"
            element={
              <ProtectedRoute>
                <IncidentForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/incidents"
            element={
              <ProtectedRoute>
                <IncidentList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/incident/:id"
            element={
              <ProtectedRoute>
                <IncidentDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <RoleRoute allowedRoles={["Admin", "HSE", "Management"]}>
                <Reports />
              </RoleRoute>
            }
          />

          <Route
            path="/actions"
            element={
              <RoleRoute allowedRoles={["Admin", "HSE", "Management"]}>
                <ActionTracker />
              </RoleRoute>
            }
          />

          <Route
            path="/incident/:id/approval"
            element={
              <RoleRoute allowedRoles={["Admin", "Supervisor"]}>
                <IncidentApproval />
              </RoleRoute>
            }
          />

          <Route
            path="/investigation/:id"
            element={
              <RoleRoute allowedRoles={["Admin", "HSE"]}>
                <Investigation />
              </RoleRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;
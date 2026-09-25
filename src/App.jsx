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
import EditIncident from "./pages/EditIncident";
import { UserProvider } from "./context/UserContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import Training from "./pages/Training";
import AddTrainingSchedule from "./pages/AddTrainingSchedule";

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
  path="/incident/:id/edit"
  element={
    <ProtectedRoute>
      <EditIncident />
    </ProtectedRoute>
  }
/>

<Route
  path="/training/schedule/new"
  element={
    <RoleRoute allowedRoles={["Admin", "HSE"]}>
      <AddTrainingSchedule />
    </RoleRoute>
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
             <RoleRoute allowedRoles={["Admin", "HSE"]}>
                <IncidentApproval />
              </RoleRoute>
            }
          />

<Route
  path="/training"
  element={
    <ProtectedRoute>
      <Training />
    </ProtectedRoute>
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
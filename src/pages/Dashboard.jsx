import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";
import pelLogo from "../assets/pel logo.png";
import pelHeader from "../assets/pel header.png";
import "../styles/Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();

  const [totalIncidents, setTotalIncidents] = useState(0);
  const [pendingIncidents, setPendingIncidents] = useState(0);
  const [closedIncidents, setClosedIncidents] = useState(0);
  const [recentIncidents, setRecentIncidents] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Dashboard loading failed:", error);
      return;
    }

    const incidents = data || [];

    setRecentIncidents(incidents);
    setTotalIncidents(incidents.length);

    setPendingIncidents(
      incidents.filter(
        (incident) => incident.report_status === "Pending Approval"
      ).length
    );

    setClosedIncidents(
      incidents.filter(
        (incident) => incident.report_status === "Closed"
      ).length
    );
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout failed:", error);
      alert(error.message);
      return;
    }

    navigate("/login");
  }

  function getStatusClass(status) {
    if (status === "Pending Approval") {
      return "dashboard-status-pending";
    }

    if (
      status === "Approved" ||
      status === "Under Investigation" ||
      status === "Corrective Actions Open" ||
      status === "Awaiting Verification"
    ) {
      return "dashboard-status-active";
    }

    if (status === "Closed") {
      return "dashboard-status-closed";
    }

    if (status === "Rejected") {
      return "dashboard-status-rejected";
    }

    return "dashboard-status-default";
  }

  const canViewManagementModules =
    user?.user_type === "Admin" ||
    user?.user_type === "HSE" ||
    user?.user_type === "Management";

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <header
          className="dashboard-header"
          style={{
            backgroundImage: `
              linear-gradient(
                rgba(17, 24, 39, 0.9),
                rgba(17, 24, 39, 0.94)
              ),
              url(${pelHeader})
            `,
          }}
        >
          <div className="dashboard-header-content">
            <div className="dashboard-brand">
              <img
                src={pelLogo}
                alt="PEL Logo"
                className="dashboard-logo"
              />

              <div>
                <h1>PEL HSE Portal</h1>
                <p>Health, Safety & Environment Management System</p>
              </div>
            </div>

            <div className="dashboard-user-area">
              <div className="dashboard-user-details">
                <span>Logged in as</span>
                <strong>{user?.full_name || user?.email || "User"}</strong>
                <small>{user?.user_type || "Employee"}</small>
              </div>

              <button
                className="dashboard-logout-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <nav className="dashboard-navigation">
          <button onClick={() => navigate("/incident")}>
            <span className="dashboard-nav-icon">＋</span>
            <span>
              <strong>Report Incident</strong>
              <small>Submit a new report</small>
            </span>
          </button>

          <button onClick={() => navigate("/incidents")}>
            <span className="dashboard-nav-icon">📋</span>
            <span>
              <strong>Incident Register</strong>
              <small>View reported incidents</small>
            </span>
          </button>

          {canViewManagementModules && (
            <button onClick={() => navigate("/actions")}>
              <span className="dashboard-nav-icon">✅</span>
              <span>
                <strong>Corrective Actions</strong>
                <small>Track actions and deadlines</small>
              </span>
            </button>
          )}

          <button>
            <span className="dashboard-nav-icon">🔍</span>
            <span>
              <strong>Inspections</strong>
              <small>Coming soon</small>
            </span>
          </button>

          <button>
            <span className="dashboard-nav-icon">🎓</span>
            <span>
              <strong>Training</strong>
              <small>Coming soon</small>
            </span>
          </button>

          {(user?.user_type === "Admin" || user?.user_type === "HSE") && (
            <button>
              <span className="dashboard-nav-icon">👥</span>
              <span>
                <strong>Employees</strong>
                <small>Manage portal users</small>
              </span>
            </button>
          )}

          {canViewManagementModules && (
            <button onClick={() => navigate("/reports")}>
              <span className="dashboard-nav-icon">📊</span>
              <span>
                <strong>Reports</strong>
                <small>Analytics and trends</small>
              </span>
            </button>
          )}
        </nav>

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <h2>Incident Overview</h2>
              <p>Current incident reporting status</p>
            </div>
          </div>

          <div className="dashboard-kpi-grid">
            <div className="dashboard-kpi-card">
              <div className="dashboard-kpi-icon">📋</div>
              <div>
                <span>Total Incidents</span>
                <strong>{totalIncidents}</strong>
              </div>
            </div>

            <div className="dashboard-kpi-card pending">
              <div className="dashboard-kpi-icon">⏳</div>
              <div>
                <span>Pending Approval</span>
                <strong>{pendingIncidents}</strong>
              </div>
            </div>

            <div className="dashboard-kpi-card closed">
              <div className="dashboard-kpi-icon">✓</div>
              <div>
                <span>Closed Incidents</span>
                <strong>{closedIncidents}</strong>
              </div>
            </div>

            <div className="dashboard-kpi-card open">
              <div className="dashboard-kpi-icon">⚙</div>
              <div>
                <span>Open Cases</span>
                <strong>{Math.max(totalIncidents - closedIncidents, 0)}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <h2>Recent Incidents</h2>
              <p>Latest reports submitted to the portal</p>
            </div>

            <button
              className="dashboard-view-all-button"
              onClick={() => navigate("/incidents")}
            >
              View All
            </button>
          </div>

          <div className="dashboard-recent-list">
            {recentIncidents.length === 0 ? (
              <div className="dashboard-empty-state">
                <span>📋</span>
                <h3>No incidents reported</h3>
                <p>New incident reports will appear here.</p>
              </div>
            ) : (
              recentIncidents.slice(0, 5).map((incident) => (
                <button
                  type="button"
                  className="dashboard-incident-row"
                  key={incident.id}
                  onClick={() => navigate(`/incident/${incident.id}`)}
                >
                  <div className="dashboard-incident-number">
                    <span>Incident</span>
                    <strong>
                      {incident.incident_no || `#${incident.id}`}
                    </strong>
                  </div>

                  <div className="dashboard-incident-main">
                    <strong>
                      {incident.incident_type || "Incident Report"}
                    </strong>
                    <span>
                      {incident.exact_location || "Location not recorded"}
                    </span>
                  </div>

                  <div className="dashboard-incident-date">
                    <span>Date</span>
                    <strong>{incident.incident_date || "N/A"}</strong>
                  </div>

                  <div>
                    <span
                      className={`dashboard-status-badge ${getStatusClass(
                        incident.report_status
                      )}`}
                    >
                      {incident.report_status || "N/A"}
                    </span>
                  </div>

                  <div className="dashboard-row-arrow">→</div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";
import "../styles/IncidentList.css";

function IncidentList() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();

  const [incidents, setIncidents] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");

  useEffect(() => {
    if (userLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    loadPage();
  }, [user, userLoading]);

  async function loadPage() {
    setLoading(true);

    await Promise.all([fetchIncidents(), fetchSites()]);

    setLoading(false);
  }

  async function fetchIncidents() {
    const { data, error } = await supabase
      .from("incidents")
      .select("*, sites(name)")
      .order("id", { ascending: false });

    if (error) {
      console.error("Incident loading failed:", error);
      return;
    }

    setIncidents(data || []);
  }

  async function fetchSites() {
    const { data, error } = await supabase
      .from("sites")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Site loading failed:", error);
      return;
    }

    setSites(data || []);
  }

  function clearFilters() {
    setTypeFilter("");
    setStatusFilter("");
    setSeverityFilter("");
    setSiteFilter("");
  }

  function getStatusClass(status) {
    if (status === "Pending") {
      return "register-status-pending";
    }

    if (status === "Approved") {
      return "register-status-approved";
    }

    if (status === "Under Investigation") {
      return "register-status-investigation";
    }

    if (status === "Corrective Actions Open") {
      return "register-status-actions";
    }

    if (status === "Awaiting Verification") {
      return "register-status-verification";
    }

    if (
      status === "Disapproved" ||
      status === "Rejected"
    ) {
      return "register-status-rejected";
    }

    if (status === "Closed") {
      return "register-status-closed";
    }

    return "register-status-default";
  }

  function getSeverityClass(severity) {
    if (severity === "Low") {
      return "register-severity-low";
    }

    if (severity === "Medium") {
      return "register-severity-medium";
    }

    if (severity === "High") {
      return "register-severity-high";
    }

    if (severity === "Catastrophic") {
      return "register-severity-catastrophic";
    }

    return "register-severity-default";
  }

  const filteredIncidents = incidents.filter((incident) => {
    const matchesType =
      typeFilter === "" ||
      incident.incident_type === typeFilter;

    const matchesStatus =
      statusFilter === "" ||
      incident.approval_status === statusFilter;

    const matchesSeverity =
      severityFilter === "" ||
      incident.severity === severityFilter;

    const matchesSite =
      siteFilter === "" ||
      String(incident.site_id) === siteFilter;

    return (
      matchesType &&
      matchesStatus &&
      matchesSeverity &&
      matchesSite
    );
  });

  const activeFilterCount = [
    typeFilter,
    statusFilter,
    severityFilter,
    siteFilter,
  ].filter(Boolean).length;

  if (userLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  const isEmployee = user.user_type === "Employee";

  return (
    <div className="register-page">
      <div className="register-container">

        <header className="register-header">
          <div>
            <h1>Incident Register</h1>

            <p>
              {isEmployee
                ? "View your submitted incident reports."
                : "Review, filter and manage reported incidents."}
            </p>
          </div>

          <div className="register-header-actions">

            <button
              className="register-back-button"
              onClick={() => navigate("/")}
            >
              ← Dashboard
            </button>

            <button
              className="register-report-button"
              onClick={() => navigate("/incident")}
            >
              ＋ Report Incident
            </button>

          </div>
        </header>

        <section className="register-summary-grid">

          <div className="register-summary-card">
            <div className="register-summary-icon">📋</div>

            <div>
              <span>
                {isEmployee
                  ? "Your Incidents"
                  : "Total Incidents"}
              </span>

              <strong>{incidents.length}</strong>
            </div>
          </div>

          <div className="register-summary-card">
            <div className="register-summary-icon">🔎</div>

            <div>
              <span>Showing Results</span>

              <strong>
                {filteredIncidents.length}
              </strong>
            </div>
          </div>

          <div className="register-summary-card">
            <div className="register-summary-icon">⏳</div>

            <div>
              <span>Pending Approval</span>

              <strong>
                {
                  incidents.filter(
                    (incident) =>
                      incident.approval_status === "Pending"
                  ).length
                }
              </strong>
            </div>
          </div>

          <div className="register-summary-card">
            <div className="register-summary-icon">✓</div>

            <div>
              <span>Closed Cases</span>

              <strong>
                {
                  incidents.filter(
                    (incident) =>
                      incident.report_status === "Closed"
                  ).length
                }
              </strong>
            </div>
          </div>

        </section>

        <section className="register-filter-card">

          <div className="register-filter-heading">

            <div>
              <h2>Filter Incidents</h2>

              <p>
                Narrow the register by type, status, severity or
                site.
              </p>
            </div>

            {activeFilterCount > 0 && (
              <button
                className="register-clear-button"
                onClick={clearFilters}
              >
                Clear Filters ({activeFilterCount})
              </button>
            )}

          </div>

          <div className="register-filters">

            <div className="register-filter-group">
              <label>Incident Type</label>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value)
                }
              >
                <option value="">All Types</option>
                <option value="Near Miss">Near Miss</option>
                <option value="Injury">Injury</option>
                <option value="Property Damage">
                  Property Damage
                </option>
                <option value="Fire">Fire</option>
                <option value="Environmental">
                  Environmental
                </option>
                <option value="Road Accident">
                  Road Accident
                </option>
              </select>
            </div>

            <div className="register-filter-group">
              <label>Status</label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="">All Statuses</option>
                <option value="Pending">
                  Pending
                </option>
                <option value="Approved">
                  Approved
                </option>
                <option value="Under Investigation">
                  Under Investigation
                </option>
                <option value="Corrective Actions Open">
                  Corrective Actions Open
                </option>
                <option value="Awaiting Verification">
                  Awaiting Verification
                </option>
                <option value="Disapproved">
                  Disapproved
                </option>
                <option value="Closed">
                  Closed
                </option>
              </select>
            </div>

            <div className="register-filter-group">
              <label>Severity</label>

              <select
                value={severityFilter}
                onChange={(event) =>
                  setSeverityFilter(event.target.value)
                }
              >
                <option value="">All Severities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Catastrophic">
                  Catastrophic
                </option>
              </select>
            </div>

            <div className="register-filter-group">
              <label>Site</label>

              <select
                value={siteFilter}
                onChange={(event) =>
                  setSiteFilter(event.target.value)
                }
              >
                <option value="">All Sites</option>

                {sites.map((site) => (
                  <option
                    key={site.id}
                    value={String(site.id)}
                  >
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </section>

        <section className="register-table-card">

          <div className="register-table-heading">

            <div>
              <h2>
                {isEmployee
                  ? "Your Reported Incidents"
                  : "Reported Incidents"}
              </h2>

              <p>
                {filteredIncidents.length}{" "}
                {filteredIncidents.length === 1
                  ? "record"
                  : "records"}{" "}
                displayed
              </p>
            </div>

          </div>

          <div className="register-table-wrapper">

            {loading ? (

              <div className="register-empty-state">
                <div className="register-empty-icon">⏳</div>

                <h3>Loading incidents...</h3>
              </div>

            ) : filteredIncidents.length === 0 ? (

              <div className="register-empty-state">

                <div className="register-empty-icon">📋</div>

                <h3>No incidents found</h3>

                <p>
                  Try changing or clearing the selected filters.
                </p>

                {activeFilterCount > 0 && (
                  <button
                    className="register-report-button"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </button>
                )}

              </div>

            ) : (

              <table className="register-table">

                <thead>
                  <tr>
                    <th>Incident No.</th>
                    <th>Date</th>
                    <th>Site</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Reporter</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredIncidents.map((incident) => (

                    <tr
                      key={incident.id}
                      onClick={() =>
                        navigate("/incident/" + incident.id)
                      }
                    >

                      <td>
                        <strong className="register-incident-number">
                          {incident.incident_no ||
                            "#" + incident.id}
                        </strong>
                      </td>

                      <td>
                        {incident.incident_date || "N/A"}
                      </td>

                      <td>
                        <span className="register-site-name">
                          {incident.sites?.name ||
                            "Not assigned"}
                        </span>
                      </td>

                      <td>
                        {incident.incident_type || "N/A"}
                      </td>

                      <td>
                        <span
                          className={
                            "register-severity-badge " +
                            getSeverityClass(
                              incident.severity
                            )
                          }
                        >
                          {incident.severity || "N/A"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            "register-status-badge " +
                            getStatusClass(
                              incident.approval_status
                            )
                          }
                        >
                          {incident.approval_status || "N/A"}
                        </span>
                      </td>

                      <td>
                        {incident.reporter_name || "N/A"}
                      </td>

                      <td>
                        <button
                          className="register-view-button"
                          onClick={(event) => {
                            event.stopPropagation();

                            navigate(
                              "/incident/" + incident.id
                            );
                          }}
                        >
                          View →
                        </button>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            )}

          </div>

        </section>

      </div>
    </div>
  );
}

export default IncidentList;
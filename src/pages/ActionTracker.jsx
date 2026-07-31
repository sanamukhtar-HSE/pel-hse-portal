import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../styles/ActionTracker.css";

function ActionTracker() {
  const navigate = useNavigate();

  const [actions, setActions] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [siteFilter, setSiteFilter] = useState("All");
  const [dueFilter, setDueFilter] = useState("All");

  useEffect(() => {
    loadActionTracker();
  }, []);

  async function loadActionTracker() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data: actionRows, error: actionError } = await supabase
        .from("incident_corrective_actions")
        .select(
          "id, created_at, action, investigation_id, responsible_person, target_date, status, completion_date, remarks"
        )
        .order("target_date", { ascending: true });

      if (actionError) throw actionError;

      const investigationIds = [
        ...new Set(
          (actionRows || [])
            .map((item) => item.investigation_id)
            .filter(Boolean)
        ),
      ];

      let investigationRows = [];

      if (investigationIds.length > 0) {
        const { data, error } = await supabase
          .from("incident_investigations")
          .select("id, incident_id, status")
          .in("id", investigationIds);

        if (error) throw error;
        investigationRows = data || [];
      }

      const incidentIds = [
        ...new Set(
          investigationRows
            .map((item) => item.incident_id)
            .filter(Boolean)
        ),
      ];

      let incidentRows = [];

      if (incidentIds.length > 0) {
        const { data, error } = await supabase
          .from("incidents")
          .select(
            "id, incident_no, incident_date, incident_type, severity, site_id, report_status"
          )
          .in("id", incidentIds);

        if (error) throw error;
        incidentRows = data || [];
      }

      const siteIds = [
        ...new Set(incidentRows.map((item) => item.site_id).filter(Boolean)),
      ];

      let siteRows = [];

      if (siteIds.length > 0) {
        const { data, error } = await supabase
          .from("sites")
          .select("id, name")
          .in("id", siteIds);

        if (error) throw error;
        siteRows = data || [];
      }

      const investigationMap = Object.fromEntries(
        investigationRows.map((item) => [item.id, item])
      );

      const incidentMap = Object.fromEntries(
        incidentRows.map((item) => [item.id, item])
      );

      const siteMap = Object.fromEntries(
        siteRows.map((item) => [item.id, item.name])
      );

      const joinedActions = (actionRows || []).map((item) => {
        const investigation = investigationMap[item.investigation_id];
        const incident = investigation
          ? incidentMap[investigation.incident_id]
          : null;

        return {
          ...item,
          incident_id: incident?.id || null,
          incident_no: incident?.incident_no || "Not linked",
          incident_date: incident?.incident_date || null,
          incident_type: incident?.incident_type || "—",
          severity: incident?.severity || "—",
          incident_status: incident?.report_status || "—",
          site_id: incident?.site_id || null,
          site_name: incident?.site_id
            ? siteMap[incident.site_id] || "Unknown Site"
            : "Unknown Site",
        };
      });

      setActions(joinedActions);
      setSites(siteRows);
    } catch (error) {
      console.error("Action Tracker loading error:", error);
      setErrorMessage(error.message || "Unable to load corrective actions.");
    } finally {
      setLoading(false);
    }
  }

  function normalizeStatus(status) {
    return status || "Open";
  }

  function getDueCondition(item) {
    const status = normalizeStatus(item.status);

    if (status === "Verified") return "Verified";
    if (status === "Completed") return "Completed";
    if (!item.target_date) return "No Due Date";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(`${item.target_date}T00:00:00`);
    const differenceInDays = Math.ceil(
      (target.getTime() - today.getTime()) / 86400000
    );

    if (differenceInDays < 0) return "Overdue";
    if (differenceInDays <= 7) return "Due Soon";
    return "On Track";
  }

  function formatDate(dateValue) {
    if (!dateValue) return "—";

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${dateValue}T00:00:00`));
  }

  const filteredActions = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return actions.filter((item) => {
      const itemStatus = normalizeStatus(item.status);
      const dueCondition = getDueCondition(item);

      const matchesSearch =
        !normalizedSearch ||
        [
          item.action,
          item.incident_no,
          item.site_name,
          item.responsible_person,
          item.incident_type,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch)
          );

      const matchesStatus =
        statusFilter === "All" || itemStatus === statusFilter;

      const matchesSite =
        siteFilter === "All" || String(item.site_id) === siteFilter;

      const matchesDue =
        dueFilter === "All" || dueCondition === dueFilter;

      return matchesSearch && matchesStatus && matchesSite && matchesDue;
    });
  }, [actions, searchText, statusFilter, siteFilter, dueFilter]);

  const summary = useMemo(() => {
    return actions.reduce(
      (totals, item) => {
        const status = normalizeStatus(item.status);
        const dueCondition = getDueCondition(item);

        totals.total += 1;

        if (status === "Open" || status === "In Progress") {
          totals.open += 1;
        }

        if (dueCondition === "Overdue") {
          totals.overdue += 1;
        }

        if (status === "Completed") {
          totals.completed += 1;
        }

        if (status === "Verified") {
          totals.verified += 1;
        }

        return totals;
      },
      {
        total: 0,
        open: 0,
        overdue: 0,
        completed: 0,
        verified: 0,
      }
    );
  }, [actions]);

  function clearFilters() {
    setSearchText("");
    setStatusFilter("All");
    setSiteFilter("All");
    setDueFilter("All");
  }

  return (
    <div className="action-tracker-page">
      <div className="action-tracker-container">
        <section className="action-tracker-hero">
          <div>
            <span className="action-tracker-eyebrow">
              INCIDENT MANAGEMENT
            </span>
            <h1>Corrective Action Tracker</h1>
            <p>
              Monitor ownership, deadlines and closure progress across
              every incident investigation.
            </p>
          </div>

          <div className="action-tracker-hero-actions">
            <button
              className="action-tracker-secondary-button"
              onClick={() => navigate("/")}
            >
              Dashboard
            </button>

            <button
              className="action-tracker-primary-button"
              onClick={loadActionTracker}
            >
              Refresh Data
            </button>
          </div>
        </section>

        <section className="action-summary-grid">
          <article className="action-summary-card">
            <span>Total Actions</span>
            <strong>{summary.total}</strong>
            <small>All corrective actions</small>
          </article>

          <article className="action-summary-card">
            <span>Open Actions</span>
            <strong>{summary.open}</strong>
            <small>Open or in progress</small>
          </article>

          <article className="action-summary-card action-summary-danger">
            <span>Overdue</span>
            <strong>{summary.overdue}</strong>
            <small>Past target date</small>
          </article>

          <article className="action-summary-card">
            <span>Completed</span>
            <strong>{summary.completed}</strong>
            <small>Awaiting verification</small>
          </article>

          <article className="action-summary-card action-summary-success">
            <span>Verified</span>
            <strong>{summary.verified}</strong>
            <small>Successfully closed</small>
          </article>
        </section>

        <section className="action-filter-panel">
          <div className="action-search-field">
            <label htmlFor="action-search">Search</label>
            <input
              id="action-search"
              type="text"
              placeholder="Action, incident, site or responsible person"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>

          <div className="action-filter-field">
            <label htmlFor="action-status-filter">Status</label>
            <select
              id="action-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Verified">Verified</option>
            </select>
          </div>

          <div className="action-filter-field">
            <label htmlFor="action-site-filter">Site</label>
            <select
              id="action-site-filter"
              value={siteFilter}
              onChange={(event) => setSiteFilter(event.target.value)}
            >
              <option value="All">All Sites</option>
              {sites.map((site) => (
                <option key={site.id} value={String(site.id)}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          <div className="action-filter-field">
            <label htmlFor="action-due-filter">Due Condition</label>
            <select
              id="action-due-filter"
              value={dueFilter}
              onChange={(event) => setDueFilter(event.target.value)}
            >
              <option value="All">All Conditions</option>
              <option value="Overdue">Overdue</option>
              <option value="Due Soon">Due Soon</option>
              <option value="On Track">On Track</option>
              <option value="No Due Date">No Due Date</option>
              <option value="Completed">Completed</option>
              <option value="Verified">Verified</option>
            </select>
          </div>

          <button
            className="action-clear-button"
            type="button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </section>

        <section className="action-table-card">
          <div className="action-table-heading">
            <div>
              <h2>Corrective Actions</h2>
              <p>
                Showing {filteredActions.length} of {actions.length} actions
              </p>
            </div>
          </div>

          {loading ? (
            <div className="action-state-message">
              Loading corrective actions...
            </div>
          ) : errorMessage ? (
            <div className="action-state-message action-state-error">
              <strong>Unable to load the Action Tracker.</strong>
              <span>{errorMessage}</span>
            </div>
          ) : filteredActions.length === 0 ? (
            <div className="action-state-message">
              No corrective actions match the selected filters.
            </div>
          ) : (
            <div className="action-table-scroll">
              <table className="action-tracker-table">
                <thead>
                  <tr>
                    <th>Corrective Action</th>
                    <th>Incident</th>
                    <th>Site</th>
                    <th>Responsible Person</th>
                    <th>Target Date</th>
                    <th>Status</th>
                    <th>Due Condition</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredActions.map((item) => {
                    const status = normalizeStatus(item.status);
                    const dueCondition = getDueCondition(item);

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="action-description-cell">
                            <strong>{item.action || "Untitled action"}</strong>
                            {item.remarks && <span>{item.remarks}</span>}
                          </div>
                        </td>

                        <td>
                          <div className="action-incident-cell">
                            <strong>{item.incident_no}</strong>
                            <span>{item.incident_type}</span>
                          </div>
                        </td>

                        <td>{item.site_name}</td>

                        <td>
                          {item.responsible_person || "Not assigned"}
                        </td>

                        <td>{formatDate(item.target_date)}</td>

                        <td>
                          <span
                            className={`action-status-badge status-${status
                              .toLowerCase()
                              .replaceAll(" ", "-")}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`action-due-badge due-${dueCondition
                              .toLowerCase()
                              .replaceAll(" ", "-")}`}
                          >
                            {dueCondition}
                          </span>
                        </td>

                        <td>
                          <button
                            className="action-view-button"
                            type="button"
                            disabled={!item.incident_id}
                            onClick={() =>
                              navigate(
                                `/investigation/${item.incident_id}`
                              )
                            }
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ActionTracker;
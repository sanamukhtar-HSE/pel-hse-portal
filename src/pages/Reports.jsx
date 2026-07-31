import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

import IncidentTrendChart from "../components/IncidentTrendChart";
import IncidentTypeChart from "../components/IncidentTypeChart";
import SiteIncidentChart from "../components/SiteIncidentChart";
import SeverityChart from "../components/SeverityChart";

import "../styles/Reports.css";

const initialFilters = {
  site: "All",
  severity: "All",
  status: "All",
  incidentType: "All",
  datePreset: "all",
  startDate: "",
  endDate: "",
};

function Reports() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [actions, setActions] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    setLoading(true);

    const [
      { data: incidentData, error: incidentError },
      { data: actionData, error: actionError },
      { data: investigationData, error: investigationError },
    ] = await Promise.all([
      supabase
        .from("incidents")
        .select(`
          id,
          created_at,
          incident_no,
          incident_date,
          incident_type,
          severity,
          report_status,
          exact_location,
          site_id,
          sites(name)
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("incident_corrective_actions")
        .select(`
          id,
          created_at,
          action,
          responsible_person,
          target_date,
          status,
          completion_date,
          remarks,
          investigation_id
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("incident_investigations")
        .select(`
          id,
          incident_id,
          investigation_date,
          immediate_cause,
          root_cause,
          root_cause_category,
          status,
          completed_date
        `)
        .order("created_at", { ascending: false }),
    ]);

    if (incidentError) {
      console.error("Incident analytics failed:", incidentError);
    }

    if (actionError) {
      console.error("Corrective action analytics failed:", actionError);
    }

    if (investigationError) {
      console.error("Investigation analytics failed:", investigationError);
    }

    setIncidents(incidentData || []);
    setActions(actionData || []);
    setInvestigations(investigationData || []);
    setLoading(false);
  }

  const filterOptions = useMemo(() => {
    const unique = (values) =>
      [...new Set(values.filter(Boolean))].sort((a, b) =>
        String(a).localeCompare(String(b))
      );

    return {
      sites: unique(incidents.map((item) => item.sites?.name)),
      severities: unique(incidents.map((item) => item.severity)),
      statuses: unique(incidents.map((item) => item.report_status)),
      incidentTypes: unique(
        incidents.map((item) => item.incident_type)
      ),
    };
  }, [incidents]);

  const dateRange = useMemo(() => {
    const now = new Date();
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    );

    if (filters.datePreset === "all") {
      return { start: null, end: null };
    }

    if (filters.datePreset === "custom") {
      return {
        start: filters.startDate
          ? new Date(`${filters.startDate}T00:00:00`)
          : null,
        end: filters.endDate
          ? new Date(`${filters.endDate}T23:59:59`)
          : null,
      };
    }

    let start;

    if (filters.datePreset === "today") {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
    }

    if (filters.datePreset === "7days") {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 6
      );
    }

    if (filters.datePreset === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    if (filters.datePreset === "quarter") {
      const quarterStartMonth =
        Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarterStartMonth, 1);
    }

    if (filters.datePreset === "year") {
      start = new Date(now.getFullYear(), 0, 1);
    }

    return { start: start || null, end: endOfToday };
  }, [filters.datePreset, filters.startDate, filters.endDate]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const incidentDate = incident.incident_date
        ? new Date(`${incident.incident_date}T12:00:00`)
        : null;

      const matchesSite =
        filters.site === "All" ||
        incident.sites?.name === filters.site;

      const matchesSeverity =
        filters.severity === "All" ||
        incident.severity === filters.severity;

      const matchesStatus =
        filters.status === "All" ||
        incident.report_status === filters.status;

      const matchesType =
        filters.incidentType === "All" ||
        incident.incident_type === filters.incidentType;

      const matchesStart =
        !dateRange.start ||
        (incidentDate && incidentDate >= dateRange.start);

      const matchesEnd =
        !dateRange.end ||
        (incidentDate && incidentDate <= dateRange.end);

      return (
        matchesSite &&
        matchesSeverity &&
        matchesStatus &&
        matchesType &&
        matchesStart &&
        matchesEnd
      );
    });
  }, [incidents, filters, dateRange]);

  const filteredInvestigations = useMemo(() => {
    const incidentIds = new Set(
      filteredIncidents.map((incident) => incident.id)
    );

    return investigations.filter((investigation) =>
      incidentIds.has(investigation.incident_id)
    );
  }, [investigations, filteredIncidents]);

  const filteredActions = useMemo(() => {
    const investigationIds = new Set(
      filteredInvestigations.map(
        (investigation) => investigation.id
      )
    );

    return actions.filter((action) =>
      investigationIds.has(action.investigation_id)
    );
  }, [actions, filteredInvestigations]);

  const analytics = useMemo(() => {
    const today = new Date();

    const totalIncidents = filteredIncidents.length;

    const pendingIncidents = filteredIncidents.filter(
      (incident) =>
        incident.report_status === "Pending Approval"
    ).length;

    const underInvestigation = filteredIncidents.filter(
      (incident) =>
        incident.report_status === "Under Investigation"
    ).length;

    const closedIncidents = filteredIncidents.filter(
      (incident) => incident.report_status === "Closed"
    ).length;

    const highSeverity = filteredIncidents.filter(
      (incident) =>
        String(incident.severity || "").toLowerCase() === "high"
    ).length;

    const openActions = filteredActions.filter(
      (action) =>
        action.status !== "Completed" &&
        action.status !== "Verified"
    ).length;

    const overdueActions = filteredActions.filter((action) => {
      if (
        action.status === "Completed" ||
        action.status === "Verified" ||
        !action.target_date
      ) {
        return false;
      }

      return new Date(`${action.target_date}T23:59:59`) < today;
    }).length;

    const closureRate =
      totalIncidents === 0
        ? 0
        : Math.round((closedIncidents / totalIncidents) * 100);

    const typeCounts = {};
    const siteCounts = {};
    const severityCounts = {};
    const monthCounts = {};

    filteredIncidents.forEach((incident) => {
      const type = incident.incident_type || "Unknown";
      const site = incident.sites?.name || "Unknown";
      const severity = incident.severity || "Unknown";

      typeCounts[type] = (typeCounts[type] || 0) + 1;
      siteCounts[site] = (siteCounts[site] || 0) + 1;
      severityCounts[severity] =
        (severityCounts[severity] || 0) + 1;

      if (incident.incident_date) {
        const date = new Date(
          `${incident.incident_date}T12:00:00`
        );

        if (!Number.isNaN(date.getTime())) {
          const key = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}`;

          monthCounts[key] = (monthCounts[key] || 0) + 1;
        }
      }
    });

    const typeData = Object.entries(typeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const siteData = Object.entries(siteCounts)
      .map(([site, count]) => ({
        site,
        incidents: count,
      }))
      .sort((a, b) => b.incidents - a.incidents);

    const severityData = Object.entries(severityCounts).map(
      ([name, value]) => ({ name, value })
    );

    const trendData = Object.keys(monthCounts)
      .sort()
      .map((key) => {
        const [year, month] = key.split("-");
        const date = new Date(Number(year), Number(month) - 1, 1);

        return {
          month: date.toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          }),
          incidents: monthCounts[key],
        };
      });

    const rootCauseCounts = {};

    filteredInvestigations.forEach((investigation) => {
      const category =
        investigation.root_cause_category || "Uncategorised";

      rootCauseCounts[category] =
        (rootCauseCounts[category] || 0) + 1;
    });

    const rootCauseData = Object.entries(rootCauseCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totalIncidents,
      pendingIncidents,
      underInvestigation,
      closedIncidents,
      highSeverity,
      openActions,
      overdueActions,
      closureRate,
      typeData,
      siteData,
      severityData,
      trendData,
      rootCauseData,
      topSite: siteData[0]?.site || "No site data",
      topIncidentType:
        typeData[0]?.name || "No incident data",
      topRootCause:
        rootCauseData[0]?.name ||
        "Not enough investigation data",
    };
  }, [
    filteredIncidents,
    filteredActions,
    filteredInvestigations,
  ]);

  const activeFilterCount = [
    filters.site !== "All",
    filters.severity !== "All",
    filters.status !== "All",
    filters.incidentType !== "All",
    filters.datePreset !== "all",
  ].filter(Boolean).length;

  const tabs = [
    { id: "overview", label: "Overview", icon: "⌂" },
    { id: "incidents", label: "Incident Analysis", icon: "▥" },
    { id: "sites", label: "Site Performance", icon: "▦" },
    { id: "actions", label: "Corrective Actions", icon: "☑" },
    { id: "root-causes", label: "Root Causes", icon: "◎" },
    { id: "trends", label: "Trends", icon: "⌁" },
  ];

  function updateFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function setDatePreset(preset) {
    setFilters((current) => ({
      ...current,
      datePreset: preset,
      startDate: preset === "custom" ? current.startDate : "",
      endDate: preset === "custom" ? current.endDate : "",
    }));
  }

  function resetFilters() {
    setFilters(initialFilters);
  }

  function renderMetricCard({
    title,
    value,
    subtitle,
    icon,
    tone,
  }) {
    return (
      <article className={`reports-metric-card ${tone}`}>
        <div className={`reports-metric-icon ${tone}`}>
          {icon}
        </div>

        <div className="reports-metric-copy">
          <span>{title}</span>
          <strong>{value}</strong>
          <small>{subtitle}</small>
        </div>
      </article>
    );
  }

  function renderOverview() {
    return (
      <>
        <section className="reports-kpi-panel">
          <div className="reports-kpi-group attention">
            <div className="reports-group-title danger">
              Attention Required
            </div>

            <div className="reports-kpi-grid four">
              {renderMetricCard({
                title: "Pending Approval",
                value: analytics.pendingIncidents,
                subtitle: "Awaiting review",
                icon: "⌛",
                tone: "danger",
              })}

              {renderMetricCard({
                title: "Open Actions",
                value: analytics.openActions,
                subtitle: "Actions outstanding",
                icon: "🔧",
                tone: "warning",
              })}

              {renderMetricCard({
                title: "Overdue Actions",
                value: analytics.overdueActions,
                subtitle: "Past target date",
                icon: "⚠",
                tone:
                  analytics.overdueActions > 0
                    ? "danger"
                    : "success",
              })}

              {renderMetricCard({
                title: "Under Investigation",
                value: analytics.underInvestigation,
                subtitle: "Active investigations",
                icon: "⌕",
                tone: "info",
              })}
            </div>
          </div>

          <div className="reports-kpi-divider" />

          <div className="reports-kpi-group performance">
            <div className="reports-group-title">
              Performance Summary
            </div>

            <div className="reports-kpi-grid four">
              {renderMetricCard({
                title: "Total Incidents",
                value: analytics.totalIncidents,
                subtitle: "All reported cases",
                icon: "▣",
                tone: "info",
              })}

              {renderMetricCard({
                title: "Closed Cases",
                value: analytics.closedIncidents,
                subtitle: "Completed lifecycle",
                icon: "✓",
                tone: "success",
              })}

              {renderMetricCard({
                title: "High Severity",
                value: analytics.highSeverity,
                subtitle: "High-risk events",
                icon: "◆",
                tone: "warning",
              })}

              {renderMetricCard({
                title: "Closure Rate",
                value: `${analytics.closureRate}%`,
                subtitle: "Cases closed",
                icon: "%",
                tone: "neutral",
              })}
            </div>
          </div>
        </section>

        <section className="reports-chart-grid">
          <div className="reports-chart-shell">
            <IncidentTrendChart data={analytics.trendData} />
          </div>

          <div className="reports-chart-shell">
            <IncidentTypeChart data={analytics.typeData} />
          </div>

          <div className="reports-chart-shell">
            <SiteIncidentChart data={analytics.siteData} />
          </div>

          <div className="reports-chart-shell">
            <SeverityChart data={analytics.severityData} />
          </div>
        </section>

        <section className="reports-insight-grid">
          <div className="reports-summary-card">
            <div className="reports-card-title">
              <span>▤</span>
              Executive Summary
            </div>

            <div className="reports-summary-list">
              <SummaryLine
                tone="danger"
                text={`${analytics.pendingIncidents} incident report${
                  analytics.pendingIncidents === 1 ? "" : "s"
                } awaiting approval.`}
              />

              <SummaryLine
                tone="warning"
                text={`${analytics.openActions} corrective action${
                  analytics.openActions === 1 ? "" : "s"
                } currently open.`}
              />

              <SummaryLine
                tone={
                  analytics.overdueActions > 0
                    ? "danger"
                    : "success"
                }
                text={
                  analytics.overdueActions > 0
                    ? `${analytics.overdueActions} action${
                        analytics.overdueActions === 1 ? "" : "s"
                      } overdue.`
                    : "No corrective actions are overdue."
                }
              />

              <SummaryLine
                tone="info"
                text={`${analytics.topSite} has the highest incident count in the current selection.`}
              />

              <SummaryLine
                tone="neutral"
                text={`${analytics.topIncidentType} is the most common incident type.`}
              />
            </div>
          </div>

          <div className="reports-highlight-card root-cause">
            <div className="reports-card-title">
              <span>◎</span>
              Top Root Cause Category
            </div>

            <strong>{analytics.topRootCause}</strong>
            <p>
              Based on investigations included in the current
              filters.
            </p>

            <button
              type="button"
              onClick={() => setActiveTab("root-causes")}
            >
              View root-cause analysis →
            </button>
          </div>

          <div className="reports-highlight-card selection">
            <div className="reports-card-title">
              <span>◉</span>
              Current Selection
            </div>

            <dl>
              <div>
                <dt>Incidents</dt>
                <dd>{filteredIncidents.length}</dd>
              </div>

              <div>
                <dt>Investigations</dt>
                <dd>{filteredInvestigations.length}</dd>
              </div>

              <div>
                <dt>Corrective actions</dt>
                <dd>{filteredActions.length}</dd>
              </div>
            </dl>
          </div>
        </section>

        <LatestIncidentsTable incidents={filteredIncidents.slice(0, 8)} />
      </>
    );
  }

  function renderIncidentAnalysis() {
    return (
      <section>
        <PageHeading
          eyebrow="Incident profile"
          title="Incident Analysis"
          text="Review the selected incidents by type and severity."
        />

        <div className="reports-chart-grid">
          <div className="reports-chart-shell">
            <IncidentTypeChart data={analytics.typeData} />
          </div>

          <div className="reports-chart-shell">
            <SeverityChart data={analytics.severityData} />
          </div>
        </div>

        <LatestIncidentsTable incidents={filteredIncidents} />
      </section>
    );
  }

  function renderSitePerformance() {
    return (
      <section>
        <PageHeading
          eyebrow="Site comparison"
          title="Site Performance"
          text="Compare incident activity across sites using the active filters."
        />

        <div className="reports-chart-grid one-column">
          <div className="reports-chart-shell">
            <SiteIncidentChart data={analytics.siteData} />
          </div>
        </div>
      </section>
    );
  }

  function renderCorrectiveActions() {
    return (
      <section>
        <PageHeading
          eyebrow="Action performance"
          title="Corrective Actions"
          text="Monitor outstanding and overdue actions linked to the selected incidents."
          action={
            <button
              className="reports-primary-button"
              onClick={() => navigate("/actions")}
            >
              Open Action Tracker
            </button>
          }
        />

        <div className="reports-kpi-grid three standalone">
          {renderMetricCard({
            title: "Total Actions",
            value: filteredActions.length,
            subtitle: "Linked to selected incidents",
            icon: "☑",
            tone: "info",
          })}

          {renderMetricCard({
            title: "Open Actions",
            value: analytics.openActions,
            subtitle: "Still requiring completion",
            icon: "🔧",
            tone: "warning",
          })}

          {renderMetricCard({
            title: "Overdue Actions",
            value: analytics.overdueActions,
            subtitle: "Past target date",
            icon: "⚠",
            tone:
              analytics.overdueActions > 0
                ? "danger"
                : "success",
          })}
        </div>
      </section>
    );
  }

  function renderRootCauses() {
    return (
      <section>
        <PageHeading
          eyebrow="Investigation insight"
          title="Root Cause Analysis"
          text="Root-cause categories from investigations included in the current selection."
        />

        <div className="reports-ranking-card">
          {analytics.rootCauseData.length === 0 ? (
            <div className="reports-empty-state">
              <span>◎</span>
              <h3>No root-cause data</h3>
              <p>
                Root-cause categories will appear after investigations
                are saved.
              </p>
            </div>
          ) : (
            analytics.rootCauseData.map((item, index) => (
              <div className="reports-ranking-row" key={item.name}>
                <span>{index + 1}</span>
                <strong>{item.name}</strong>
                <b>{item.value}</b>
              </div>
            ))
          )}
        </div>
      </section>
    );
  }

  function renderTrends() {
    return (
      <section>
        <PageHeading
          eyebrow="Time-based performance"
          title="Incident Trends"
          text="Monthly incident activity for the active selection."
        />

        <div className="reports-chart-grid one-column">
          <div className="reports-chart-shell">
            <IncidentTrendChart data={analytics.trendData} />
          </div>
        </div>
      </section>
    );
  }

  function renderActiveTab() {
    if (activeTab === "incidents") return renderIncidentAnalysis();
    if (activeTab === "sites") return renderSitePerformance();
    if (activeTab === "actions") return renderCorrectiveActions();
    if (activeTab === "root-causes") return renderRootCauses();
    if (activeTab === "trends") return renderTrends();

    return renderOverview();
  }

  return (
    <div className="reports-page">
      <div className="reports-container">
        <header className="reports-header">
          <button
            type="button"
            className="reports-back-button"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>

          <div className="reports-header-copy">
            <span>Management Analytics</span>
            <h1>PEL HSE Reports</h1>
            <p>
              Clear operational priorities, incident performance, and
              management insights.
            </p>
          </div>

          <button
            type="button"
            className="reports-refresh-button"
            onClick={fetchAnalytics}
          >
            ↻ Refresh
          </button>
        </header>

        <section className="reports-filter-panel">
          <div className="reports-filter-heading">
            <div>
              <span>Report Filters</span>
              <strong>
                {activeFilterCount === 0
                  ? "Showing all available data"
                  : `${activeFilterCount} filter${
                      activeFilterCount === 1 ? "" : "s"
                    } applied`}
              </strong>
            </div>

            <button
              type="button"
              className="reports-reset-button"
              onClick={resetFilters}
              disabled={activeFilterCount === 0}
            >
              Reset filters
            </button>
          </div>

          <div className="reports-filter-grid">
            <FilterSelect
              label="Site"
              value={filters.site}
              onChange={(value) => updateFilter("site", value)}
              options={filterOptions.sites}
            />

            <FilterSelect
              label="Severity"
              value={filters.severity}
              onChange={(value) =>
                updateFilter("severity", value)
              }
              options={filterOptions.severities}
            />

            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(value) => updateFilter("status", value)}
              options={filterOptions.statuses}
            />

            <FilterSelect
              label="Incident Type"
              value={filters.incidentType}
              onChange={(value) =>
                updateFilter("incidentType", value)
              }
              options={filterOptions.incidentTypes}
            />
          </div>

          <div className="reports-date-row">
            <span>Date range</span>

            <div className="reports-date-presets">
              {[
                ["all", "All Time"],
                ["today", "Today"],
                ["7days", "Last 7 Days"],
                ["month", "This Month"],
                ["quarter", "This Quarter"],
                ["year", "This Year"],
                ["custom", "Custom"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={
                    filters.datePreset === value ? "active" : ""
                  }
                  onClick={() => setDatePreset(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            {filters.datePreset === "custom" && (
              <div className="reports-custom-dates">
                <label>
                  From
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(event) =>
                      updateFilter(
                        "startDate",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  To
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(event) =>
                      updateFilter(
                        "endDate",
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>
            )}
          </div>
        </section>

        <nav className="reports-tabs" aria-label="Report sections">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="reports-content">
          {loading ? (
            <div className="reports-loading">
              <div className="reports-spinner" />
              <span>Loading management analytics...</span>
            </div>
          ) : (
            renderActiveTab()
          )}
        </main>

        <footer className="reports-footer">
          All data is live from the PEL HSE Portal
          <span>•</span>
          Filters update the dashboard instantly
        </footer>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <label className="reports-filter-control">
      <span>{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="All">All {label}s</option>

        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function PageHeading({ eyebrow, title, text, action }) {
  return (
    <div className="reports-page-heading">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>

      {action}
    </div>
  );
}

function SummaryLine({ tone, text }) {
  return (
    <div className={`reports-summary-line ${tone}`}>
      <span />
      <p>{text}</p>
    </div>
  );
}

function LatestIncidentsTable({ incidents }) {
  return (
    <section className="reports-table-card">
      <div className="reports-table-heading">
        <div>
          <span>Recent Activity</span>
          <h2>Latest Incidents</h2>
        </div>

        <small>{incidents.length} record(s) shown</small>
      </div>

      <div className="reports-table-wrap">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Incident No.</th>
              <th>Date</th>
              <th>Type</th>
              <th>Site</th>
              <th>Severity</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {incidents.length === 0 ? (
              <tr>
                <td colSpan="6" className="reports-empty-cell">
                  No incidents match the current filters.
                </td>
              </tr>
            ) : (
              incidents.map((incident) => (
                <tr key={incident.id}>
                  <td>
                    <strong>
                      {incident.incident_no || `#${incident.id}`}
                    </strong>
                  </td>
                  <td>{incident.incident_date || "N/A"}</td>
                  <td>{incident.incident_type || "N/A"}</td>
                  <td>{incident.sites?.name || "Unknown"}</td>
                  <td>{incident.severity || "N/A"}</td>
                  <td>
                    <span className="reports-status-pill">
                      {incident.report_status || "N/A"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default Reports;
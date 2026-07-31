import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";
import "../styles/IncidentDetails.css";

function IncidentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [incident, setIncident] = useState(null);
  const [people, setPeople] = useState([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [reporter, setReporter] = useState(null);
  const [investigation, setInvestigation] = useState(null);
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const canApprove =
    user?.user_type === "Admin" ||
    user?.user_type === "Supervisor";

  const canInvestigate =
    user?.user_type === "Admin" ||
    user?.user_type === "HSE";

  const investigationAllowedStatuses = [
    "Approved",
    "Under Investigation",
    "Corrective Actions Open",
    "Awaiting Verification",
    "Closed",
  ];

  const canOpenInvestigation =
    investigationAllowedStatuses.includes(
      incident?.report_status
    );

  useEffect(() => {
    loadIncident();
  }, [id]);

  async function loadIncident() {
    setLoading(true);

    const { data, error } = await supabase
      .from("incidents")
      .select(`
        *,
        sites (
          name
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Incident loading failed:", error);
      setLoading(false);
      return;
    }

    setIncident(data);

    const { data: reporterData, error: reporterError } =
      await supabase
        .from("employees")
        .select("employee_no, department")
        .eq("full_name", data.reporter_name)
        .maybeSingle();

    if (reporterError) {
      console.error(
        "Reporter lookup failed:",
        reporterError
      );
    } else {
      setReporter(reporterData);
    }

    if (data.photo_url) {
      setPhotoUrl(data.photo_url);
    } else {
      setPhotoUrl("");
    }

    const { data: peopleData, error: peopleError } =
      await supabase
        .from("incident_people")
        .select("*")
        .eq("incident_id", data.id);

    if (peopleError) {
      console.error(
        "People loading failed:",
        peopleError
      );
    } else {
      setPeople(peopleData || []);
    }

    const {
      data: investigationData,
      error: investigationError,
    } = await supabase
      .from("incident_investigations")
      .select("*")
      .eq("incident_id", data.id)
      .maybeSingle();

    if (investigationError) {
      console.error(
        "Investigation loading failed:",
        investigationError
      );
    } else {
      setInvestigation(investigationData);

      if (investigationData?.id) {
        const { data: correctiveActionData, error: correctiveActionError } =
          await supabase
            .from("incident_corrective_actions")
            .select("*")
            .eq("investigation_id", investigationData.id)
            .order("target_date", { ascending: true });

        if (correctiveActionError) {
          console.error(
            "Corrective actions loading failed:",
            correctiveActionError
          );
          setCorrectiveActions([]);
        } else {
          setCorrectiveActions(correctiveActionData || []);
        }
      } else {
        setCorrectiveActions([]);
      }
    }

    setLoading(false);
  }

  function getStatusClass(status) {
    if (status === "Pending Approval") {
      return "pending";
    }

    if (status === "Approved") {
      return "approved";
    }

    if (status === "Rejected") {
      return "rejected";
    }

    if (
      status === "Under Investigation" ||
      status === "Corrective Actions Open"
    ) {
      return "pending";
    }

    return "closed";
  }


  function formatDate(dateValue) {
    if (!dateValue) return "Not recorded";

    return new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function isActionOverdue(action) {
    if (!action.target_date) return false;

    const finishedStatuses = ["Completed", "Verified"];

    if (finishedStatuses.includes(action.status)) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(`${action.target_date}T00:00:00`);

    return targetDate < today;
  }

  function getActionStatusClass(action) {
    if (isActionOverdue(action)) return "overdue";

    return (action.status || "Open")
      .toLowerCase()
      .replaceAll(" ", "-");
  }

  function getInvestigationButtonText() {
    if (!investigation) {
      return "🔍 Start Investigation";
    }

    if (
      investigation.status === "Completed" ||
      incident?.report_status === "Closed"
    ) {
      return "📋 View Investigation";
    }

    return "✏️ Continue Investigation";
  }

  if (loading) {
    return <h2>Loading...</h2>;
  }

  if (!incident) {
    return (
      <div className="incident-details-page">
        <h2>Incident not found.</h2>

        <button
          className="back-button"
          onClick={() => navigate("/incidents")}
        >
          ← Incident Register
        </button>
      </div>
    );
  }

  return (
    <div className="incident-details-page">
      <div className="header">
        <button
          className="back-button"
          onClick={() => navigate("/incidents")}
        >
          ← Incident Register
        </button>

        <h1>
          Incident{" "}
          {incident.incident_no || `#${incident.id}`}
        </h1>

        <p>Incident Details</p>

        <div className="header-actions">
          {canApprove &&
            incident.report_status ===
              "Pending Approval" && (
              <button
                className="print-button"
                onClick={() =>
                  navigate(
                    `/incident/${incident.id}/approval`
                  )
                }
              >
                ✅ Supervisor Approval
              </button>
            )}

          {canInvestigate && canOpenInvestigation && (
            <button
              className="print-button"
              onClick={() =>
                navigate(
                  `/investigation/${incident.id}`
                )
              }
            >
              {getInvestigationButtonText()}
            </button>
          )}

          <button
            className="print-button"
            onClick={() => window.print()}
          >
            🖨 Print Report
          </button>
        </div>
      </div>

      <div className="card">
        <h2>👤 Reporter Information</h2>

        <div className="details-grid">
          <div className="info-box">
            <strong>Employee Name</strong>
            {incident.reporter_name || "N/A"}
          </div>

          <div className="info-box">
            <strong>Employee Number</strong>
            {reporter?.employee_no || "N/A"}
          </div>

          <div className="info-box">
            <strong>Designation</strong>
            {incident.reporter_designation || "N/A"}
          </div>

          <div className="info-box">
            <strong>Department</strong>
            {reporter?.department || "N/A"}
          </div>

          <div className="info-box">
            <strong>Site</strong>
            {incident.sites?.name ||
              "Site not assigned"}
          </div>

          <div className="info-box">
            <strong>Report Status</strong>

            <span
              className={`status-badge ${getStatusClass(
                incident.report_status
              )}`}
            >
              {incident.report_status || "N/A"}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>📋 Incident Information</h2>

        <div className="details-grid">
          <div className="info-box">
            <strong>Date</strong>
            {incident.incident_date || "N/A"}
          </div>

          <div className="info-box">
            <strong>Time</strong>
            {incident.incident_time || "N/A"}
          </div>

          <div className="info-box">
            <strong>Incident Type</strong>
            {incident.incident_type || "N/A"}
          </div>

          <div className="info-box">
            <strong>Severity</strong>

            <span
              className={`severity-badge ${(
                incident.severity || ""
              ).toLowerCase()}`}
            >
              {incident.severity || "N/A"}
            </span>
          </div>

          <div className="info-box">
            <strong>Status</strong>

            <span
              className={`status-badge ${getStatusClass(
                incident.report_status
              )}`}
            >
              {incident.report_status || "N/A"}
            </span>
          </div>

          <div className="info-box">
            <strong>Location</strong>
            {incident.exact_location || "N/A"}
          </div>

          <div className="info-box">
            <strong>Operation Area</strong>
            {incident.operation_area || "N/A"}
          </div>

          <div className="info-box">
            <strong>Activity</strong>
            {incident.activity || "N/A"}
          </div>

          <div className="info-box">
            <strong>Under Supervision</strong>
            {incident.under_supervision || "N/A"}
          </div>

          <div className="info-box">
            <strong>PTW Required</strong>
            {incident.ptw_required || "N/A"}
          </div>

          <div className="info-box">
            <strong>Permit Number</strong>
            {incident.permit_number || "N/A"}
          </div>
        </div>

        <h2 style={{ marginTop: "30px" }}>
          📝 Description
        </h2>

        <div className="info-box">
          {incident.description ||
            "No description provided."}
        </div>

        <h2 style={{ marginTop: "30px" }}>
          📌 Additional Remarks
        </h2>

        <div className="info-box">
          {incident.remarks ||
            "No additional remarks."}
        </div>

        <hr />

        <h2>👥 People Involved</h2>

        {people.length === 0 ? (
          <p>No people recorded.</p>
        ) : (
          <table className="incident-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Designation</th>
                <th>Role</th>
              </tr>
            </thead>

            <tbody>
              {people.map((person) => (
                <tr key={person.id}>
                  <td>{person.name || "N/A"}</td>
                  <td>{person.company || "N/A"}</td>
                  <td>
                    {person.designation || "N/A"}
                  </td>
                  <td>{person.role || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <hr />

        <h2>📷 Incident Photo</h2>

        {photoUrl ? (
          <a
            href={photoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={photoUrl}
              alt="Incident"
              style={{
                width: "100%",
                maxWidth: "500px",
                borderRadius: "10px",
                marginTop: "10px",
                cursor: "pointer",
              }}
            />
          </a>
        ) : (
          <p>No photo uploaded.</p>
        )}
      </div>

      <div className="card">
        <h2>🔍 Incident Investigation</h2>

        {!canOpenInvestigation ? (
          <div className="info-box">
            <strong>Investigation Status</strong>
            Investigation can begin after supervisor
            approval.
          </div>
        ) : (
          <>
            <div className="details-grid">
              <div className="info-box">
                <strong>Investigation Status</strong>
                {investigation?.status || "Not Started"}
              </div>

              <div className="info-box">
                <strong>Investigation Date</strong>
                {investigation?.investigation_date ||
                  "Not recorded"}
              </div>

              <div className="info-box">
                <strong>Root Cause Category</strong>
                {investigation?.root_cause_category ||
                  "Not recorded"}
              </div>

              <div className="info-box">
                <strong>Completion Date</strong>
                {investigation?.completed_date ||
                  "Not completed"}
              </div>
            </div>

            {canInvestigate && (
              <button
                className="print-button"
                style={{ marginTop: "20px" }}
                onClick={() =>
                  navigate(
                    `/investigation/${incident.id}`
                  )
                }
              >
                {getInvestigationButtonText()}
              </button>
            )}

            {!canInvestigate && investigation && (
              <button
                className="print-button"
                style={{ marginTop: "20px" }}
                onClick={() =>
                  navigate(
                    `/investigation/${incident.id}`
                  )
                }
              >
                📋 View Investigation
              </button>
            )}
          </>
        )}
      </div>


      {investigation && (
        <div className="card corrective-actions-summary-card">
          <div className="corrective-actions-summary-header">
            <div>
              <h2>✅ Corrective Action Progress</h2>
              <p>
                Actions assigned from the investigation findings.
              </p>
            </div>

            <div className="corrective-actions-count">
              {correctiveActions.length}
              <span>
                {correctiveActions.length === 1 ? "Action" : "Actions"}
              </span>
            </div>
          </div>

          {correctiveActions.length === 0 ? (
            <div className="corrective-actions-empty-state">
              No corrective actions have been recorded for this
              investigation.
            </div>
          ) : (
            <div className="corrective-actions-list">
              {correctiveActions.map((action, index) => (
                <div
                  className={`corrective-action-summary ${
                    isActionOverdue(action) ? "is-overdue" : ""
                  }`}
                  key={action.id}
                >
                  <div className="corrective-action-summary-top">
                    <div className="corrective-action-number">
                      Action {index + 1}
                    </div>

                    <span
                      className={`corrective-action-status ${getActionStatusClass(
                        action
                      )}`}
                    >
                      {isActionOverdue(action)
                        ? "Overdue"
                        : action.status || "Open"}
                    </span>
                  </div>

                  <h3>{action.action || "Action not described"}</h3>

                  <div className="corrective-action-meta">
                    <div>
                      <span>Responsible Person</span>
                      <strong>
                        {action.responsible_person || "Not assigned"}
                      </strong>
                    </div>

                    <div>
                      <span>Target Date</span>
                      <strong>{formatDate(action.target_date)}</strong>
                    </div>

                    <div>
                      <span>Completion Date</span>
                      <strong>
                        {action.completion_date
                          ? formatDate(action.completion_date)
                          : "Not completed"}
                      </strong>
                    </div>
                  </div>

                  {action.remarks && (
                    <div className="corrective-action-remarks">
                      <strong>Remarks</strong>
                      <p>{action.remarks}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default IncidentDetails;
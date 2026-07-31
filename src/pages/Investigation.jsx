import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";
import "../styles/Investigation.css";

function Investigation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [incident, setIncident] = useState(null);
  const [investigationId, setInvestigationId] = useState(null);

  const [investigationDate, setInvestigationDate] = useState("");
  const [why1, setWhy1] = useState("");
  const [why2, setWhy2] = useState("");
  const [why3, setWhy3] = useState("");
  const [why4, setWhy4] = useState("");
  const [why5, setWhy5] = useState("");
  const [immediateCause, setImmediateCause] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [rootCauseCategory, setRootCauseCategory] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState("");
  const [investigationStatus, setInvestigationStatus] =
    useState("In Progress");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const emptyCorrectiveAction = {
    id: null,
    action: "",
    responsible_person: "",
    target_date: "",
    status: "Open",
    completion_date: "",
    remarks: "",
  };

  const [correctiveActions, setCorrectiveActions] = useState([
    { ...emptyCorrectiveAction },
  ]);
  const [removedActionIds, setRemovedActionIds] = useState([]);

  const isClosed = incident?.report_status === "Closed";

  const workflowStages = [
    "Approved",
    "Under Investigation",
    "Corrective Actions Open",
    "Awaiting Verification",
    "Closed",
  ];

  const currentWorkflowIndex = Math.max(
    workflowStages.indexOf(incident?.report_status),
    0
  );

  const savedCorrectiveActions = correctiveActions.filter(
    (item) => item.action.trim() || item.id
  );

  const completedActionCount = savedCorrectiveActions.filter(
    (item) => item.status === "Completed" || item.status === "Verified"
  ).length;

  const verifiedActionCount = savedCorrectiveActions.filter(
    (item) => item.status === "Verified"
  ).length;

  const actionCompletionPercentage = savedCorrectiveActions.length
    ? Math.round(
        (completedActionCount / savedCorrectiveActions.length) * 100
      )
    : 0;

  useEffect(() => {
    loadPage();
  }, [id]);

  function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  async function loadPage() {
    setLoading(true);
    setMessage("");

    const { data: incidentData, error: incidentError } =
      await supabase
        .from("incidents")
        .select(`
          *,
          sites (
            name
          )
        `)
        .eq("id", id)
        .single();

    if (incidentError) {
      console.error("Incident loading failed:", incidentError);
      setMessage("Unable to load the incident.");
      setLoading(false);
      return;
    }

    setIncident(incidentData);

    const {
      data: investigationData,
      error: investigationError,
    } = await supabase
      .from("incident_investigations")
      .select("*")
      .eq("incident_id", id)
      .maybeSingle();

    if (investigationError) {
      console.error(
        "Investigation loading failed:",
        investigationError
      );

      setMessage("Unable to load the investigation.");
      setLoading(false);
      return;
    }

    if (investigationData) {
      setInvestigationId(investigationData.id);

      setInvestigationDate(
        investigationData.investigation_date || getTodayDate()
      );

      setWhy1(investigationData.why1 || "");
      setWhy2(investigationData.why2 || "");
      setWhy3(investigationData.why3 || "");
      setWhy4(investigationData.why4 || "");
      setWhy5(investigationData.why5 || "");

      setImmediateCause(
        investigationData.immediate_cause || ""
      );

      setRootCause(investigationData.root_cause || "");

      setRootCauseCategory(
        investigationData.root_cause_category || ""
      );

      setLessonsLearned(
        investigationData.lessons_learned || ""
      );

      setInvestigationStatus(
        investigationData.status || "In Progress"
      );

      const { data: actionData, error: actionError } = await supabase
        .from("incident_corrective_actions")
        .select("*")
        .eq("investigation_id", investigationData.id)
        .order("created_at", { ascending: true });

      if (actionError) {
        console.error("Corrective actions loading failed:", actionError);
        setMessage("Investigation loaded, but corrective actions could not be loaded.");
      } else if (actionData?.length) {
        setCorrectiveActions(
          actionData.map((item) => ({
            id: item.id,
            action: item.action || "",
            responsible_person: item.responsible_person || "",
            target_date: item.target_date || "",
            status: item.status || "Open",
            completion_date: item.completion_date || "",
            remarks: item.remarks || "",
          }))
        );
      }
    } else {
      setInvestigationDate(getTodayDate());
      setInvestigationStatus("In Progress");
    }

    setLoading(false);
  }


  function addCorrectiveAction() {
    setCorrectiveActions((current) => [
      ...current,
      { ...emptyCorrectiveAction },
    ]);
  }

  function updateCorrectiveAction(index, field, value) {
    setCorrectiveActions((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const updated = { ...item, [field]: value };

        if (field === "status") {
          if (value === "Completed" && !updated.completion_date) {
            updated.completion_date = getTodayDate();
          }

          if (value !== "Completed" && value !== "Verified") {
            updated.completion_date = "";
          }
        }

        return updated;
      })
    );
  }

  function removeCorrectiveAction(index) {
    const actionToRemove = correctiveActions[index];

    if (actionToRemove?.id) {
      setRemovedActionIds((current) => [...current, actionToRemove.id]);
    }

    setCorrectiveActions((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!investigationDate) {
      setMessage("Please select the investigation date.");
      return;
    }

    if (!user?.id) {
      setMessage(
        "The logged-in investigator could not be identified."
      );
      return;
    }

    if (
      incident?.report_status === "Pending Approval" ||
      incident?.report_status === "Rejected"
    ) {
      setMessage(
        "This incident must be approved before investigation."
      );
      return;
    }

    const actionsToSave = correctiveActions.filter(
      (item) =>
        item.action.trim() ||
        item.responsible_person.trim() ||
        item.target_date ||
        item.remarks.trim()
    );

    for (let index = 0; index < actionsToSave.length; index += 1) {
      const item = actionsToSave[index];

      if (
        !item.action.trim() ||
        !item.responsible_person.trim() ||
        !item.target_date
      ) {
        setMessage(
          `Please complete the action, responsible person and target date for Corrective Action ${index + 1}.`
        );
        return;
      }
    }

    setSaving(true);
    setMessage("");

    const hasCorrectiveActions = actionsToSave.length > 0;
    const finalInvestigationStatus = hasCorrectiveActions
      ? "Completed"
      : investigationStatus || "In Progress";

    const investigationRecord = {
      incident_id: Number(id),
      investigator_id: user.id,
      investigation_date: investigationDate,
      why1: why1.trim() || null,
      why2: why2.trim() || null,
      why3: why3.trim() || null,
      why4: why4.trim() || null,
      why5: why5.trim() || null,
      immediate_cause: immediateCause.trim() || null,
      root_cause: rootCause.trim() || null,
      root_cause_category: rootCauseCategory || null,
      lessons_learned: lessonsLearned.trim() || null,
      status: finalInvestigationStatus,
      completed_date: hasCorrectiveActions ? getTodayDate() : null,
    };

    let savedInvestigation;
    let saveError;

    if (investigationId) {
      const { data, error } = await supabase
        .from("incident_investigations")
        .update(investigationRecord)
        .eq("id", investigationId)
        .select()
        .single();

      savedInvestigation = data;
      saveError = error;
    } else {
      const { data, error } = await supabase
        .from("incident_investigations")
        .insert([investigationRecord])
        .select()
        .single();

      savedInvestigation = data;
      saveError = error;
    }

    if (saveError) {
      console.error("Investigation save failed:", saveError);
      setMessage(saveError.message);
      setSaving(false);
      return;
    }

    setInvestigationId(savedInvestigation.id);
    setInvestigationStatus(finalInvestigationStatus);

    if (removedActionIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("incident_corrective_actions")
        .delete()
        .in("id", removedActionIds);

      if (deleteError) {
        console.error("Corrective action deletion failed:", deleteError);
        setMessage(deleteError.message);
        setSaving(false);
        return;
      }
    }

    for (const item of actionsToSave) {
      const actionRecord = {
        investigation_id: savedInvestigation.id,
        action: item.action.trim(),
        responsible_person: item.responsible_person.trim(),
        target_date: item.target_date,
        status: item.status || "Open",
        completion_date:
          item.status === "Completed" || item.status === "Verified"
            ? item.completion_date || getTodayDate()
            : null,
        remarks: item.remarks.trim() || null,
      };

      if (item.id) {
        const { error: actionUpdateError } = await supabase
          .from("incident_corrective_actions")
          .update(actionRecord)
          .eq("id", item.id);

        if (actionUpdateError) {
          console.error("Corrective action update failed:", actionUpdateError);
          setMessage(actionUpdateError.message);
          setSaving(false);
          return;
        }
      } else {
        const { data: insertedAction, error: actionInsertError } =
          await supabase
            .from("incident_corrective_actions")
            .insert([actionRecord])
            .select()
            .single();

        if (actionInsertError) {
          console.error("Corrective action save failed:", actionInsertError);
          setMessage(actionInsertError.message);
          setSaving(false);
          return;
        }

        item.id = insertedAction.id;
      }
    }

    setCorrectiveActions(
      actionsToSave.length
        ? actionsToSave.map((item) => ({ ...item }))
        : [{ ...emptyCorrectiveAction }]
    );
    setRemovedActionIds([]);

    let nextIncidentStatus = incident.report_status;

    if (hasCorrectiveActions) {
      const allActionsVerified = actionsToSave.every(
        (item) => item.status === "Verified"
      );

      const allActionsCompleted = actionsToSave.every(
        (item) =>
          item.status === "Completed" ||
          item.status === "Verified"
      );

      if (allActionsVerified) {
        nextIncidentStatus = "Closed";
      } else if (allActionsCompleted) {
        nextIncidentStatus = "Awaiting Verification";
      } else {
        nextIncidentStatus = "Corrective Actions Open";
      }
    } else if (incident.report_status === "Approved") {
      nextIncidentStatus = "Under Investigation";
    }

    if (nextIncidentStatus !== incident.report_status) {
      const { error: incidentStatusError } = await supabase
        .from("incidents")
        .update({ report_status: nextIncidentStatus })
        .eq("id", id);

      if (incidentStatusError) {
        console.error(
          "Incident status update failed:",
          incidentStatusError
        );
        setMessage(
          `Investigation saved, but incident status could not be updated: ${incidentStatusError.message}`
        );
        setSaving(false);
        return;
      }

      setIncident((currentIncident) => ({
        ...currentIncident,
        report_status: nextIncidentStatus,
      }));
    }

    const successMessages = {
      "Under Investigation":
        "Investigation saved. Incident is now Under Investigation.",
      "Corrective Actions Open":
        "Corrective actions saved. Incident is now Corrective Actions Open.",
      "Awaiting Verification":
        "All corrective actions are completed. Incident is now Awaiting Verification.",
      Closed:
        "All corrective actions are verified. Incident has been Closed.",
    };

    setMessage(
      successMessages[nextIncidentStatus] ||
        "Investigation updated successfully."
    );
    setSaving(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (loading) {
    return (
      <div className="investigation-page">
        <div className="investigation-container">
          <div className="investigation-card">
            <h2>Loading investigation...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="investigation-page">
        <div className="investigation-container">
          <div className="investigation-card">
            <h2>Incident not found.</h2>

            <button
              className="investigation-back-button"
              style={{
                background: "#111827",
                marginTop: "15px",
              }}
              onClick={() => navigate("/incidents")}
            >
              ← Incident Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="investigation-page">
      <div className="investigation-container">
        <div className="investigation-header">
          <div className="investigation-header-top">
            <div>
              <h1>Incident Investigation Report</h1>

              <p>
                Incident{" "}
                {incident.incident_no || `#${incident.id}`} ·{" "}
                {incident.sites?.name || "Site not assigned"}
              </p>
            </div>

            <button
              className="investigation-back-button"
              onClick={() =>
                navigate(`/incident/${incident.id}`)
              }
            >
              ← Incident Details
            </button>
          </div>
        </div>

        {message && (
          <div className="investigation-status-banner">
            {message}
          </div>
        )}


        <div className="investigation-workflow">
          <div className="workflow-heading">
            <div>
              <span>Investigation Workflow</span>
              <strong>{incident.report_status || "Approved"}</strong>
            </div>

            <div className="workflow-percent">
              {Math.round(
                (currentWorkflowIndex /
                  (workflowStages.length - 1)) *
                  100
              )}
              %
            </div>
          </div>

          <div className="workflow-track">
            <div
              className="workflow-track-fill"
              style={{
                width: `${
                  (currentWorkflowIndex /
                    (workflowStages.length - 1)) *
                  100
                }%`,
              }}
            />
          </div>

          <div className="workflow-steps">
            {workflowStages.map((stage, index) => (
              <div
                className={`workflow-step ${
                  index < currentWorkflowIndex
                    ? "completed"
                    : index === currentWorkflowIndex
                    ? "active"
                    : ""
                }`}
                key={stage}
              >
                <div className="workflow-step-marker">
                  {index < currentWorkflowIndex ? "✓" : index + 1}
                </div>
                <span>{stage}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="investigation-card">
          <div className="investigation-card-header">
            <div className="investigation-card-icon">📋</div>

            <div>
              <h2>Incident Summary</h2>
              <p>
                Key information from the original incident report.
              </p>
            </div>
          </div>

          <div className="investigation-summary-grid">
            <div className="investigation-summary-box">
              <strong>Incident Number</strong>
              <span>
                {incident.incident_no || `#${incident.id}`}
              </span>
            </div>

            <div className="investigation-summary-box">
              <strong>Incident Date</strong>
              <span>{incident.incident_date || "N/A"}</span>
            </div>

            <div className="investigation-summary-box">
              <strong>Incident Type</strong>
              <span>{incident.incident_type || "N/A"}</span>
            </div>

            <div className="investigation-summary-box">
              <strong>Severity</strong>
              <span>{incident.severity || "N/A"}</span>
            </div>

            <div className="investigation-summary-box">
              <strong>Site</strong>
              <span>{incident.sites?.name || "N/A"}</span>
            </div>

            <div className="investigation-summary-box">
              <strong>Current Status</strong>
              <span>{incident.report_status || "N/A"}</span>
            </div>

            <div className="investigation-summary-box">
              <strong>Location</strong>
              <span>{incident.exact_location || "N/A"}</span>
            </div>

            <div className="investigation-summary-box">
              <strong>Activity</strong>
              <span>{incident.activity || "N/A"}</span>
            </div>
          </div>

          <div className="investigation-description">
            <strong
              style={{
                display: "block",
                marginBottom: "8px",
              }}
            >
              Incident Description
            </strong>

            {incident.description || "No description provided."}
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="investigation-card">
            <div className="investigation-card-header">
              <div className="investigation-card-icon">👤</div>

              <div>
                <h2>Investigation Information</h2>
                <p>
                  Investigator assignment and investigation status.
                </p>
              </div>
            </div>

            <div className="investigation-form-grid">
              <div className="investigation-form-group">
                <label>Investigator</label>

                <input
                  type="text"
                  value={
                    user?.full_name ||
                    user?.name ||
                    user?.email ||
                    "Current User"
                  }
                  readOnly
                />
              </div>

              <div className="investigation-form-group">
                <label>Investigation Date</label>

                <input
                  type="date"
                  value={investigationDate}
                  onChange={(event) =>
                    setInvestigationDate(event.target.value)
                  }
                  disabled={isClosed}
                  required
                />
              </div>

              <div className="investigation-form-group">
                <label>Investigation Status</label>

                <input
                  type="text"
                  value={investigationStatus}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="investigation-card">
            <div className="investigation-card-header">
              <div className="investigation-card-icon">❓</div>

              <div>
                <h2>Five Whys Analysis</h2>
                <p>
                  Trace the incident from the immediate event to
                  its underlying cause.
                </p>
              </div>
            </div>

            <div className="five-whys-intro">
              Begin with what happened, then repeatedly ask why
              each condition existed. The fifth answer should help
              identify the underlying system or organizational
              weakness.
            </div>

            <div className="why-block">
              <div className="why-number">1</div>

              <div className="investigation-form-group">
                <label>Why did the incident happen?</label>

                <textarea
                  value={why1}
                  onChange={(event) =>
                    setWhy1(event.target.value)
                  }
                  disabled={isClosed}
                  placeholder="Describe the first reason..."
                />
              </div>
            </div>

            <div className="why-block">
              <div className="why-number">2</div>

              <div className="investigation-form-group">
                <label>Why did that condition exist?</label>

                <textarea
                  value={why2}
                  onChange={(event) =>
                    setWhy2(event.target.value)
                  }
                  disabled={isClosed}
                  placeholder="Describe the second reason..."
                />
              </div>
            </div>

            <div className="why-block">
              <div className="why-number">3</div>

              <div className="investigation-form-group">
                <label>Why was it allowed to continue?</label>

                <textarea
                  value={why3}
                  onChange={(event) =>
                    setWhy3(event.target.value)
                  }
                  disabled={isClosed}
                  placeholder="Describe the third reason..."
                />
              </div>
            </div>

            <div className="why-block">
              <div className="why-number">4</div>

              <div className="investigation-form-group">
                <label>Why was the control ineffective?</label>

                <textarea
                  value={why4}
                  onChange={(event) =>
                    setWhy4(event.target.value)
                  }
                  disabled={isClosed}
                  placeholder="Describe the fourth reason..."
                />
              </div>
            </div>

            <div className="why-block">
              <div className="why-number">5</div>

              <div className="investigation-form-group">
                <label>What is the underlying cause?</label>

                <textarea
                  value={why5}
                  onChange={(event) =>
                    setWhy5(event.target.value)
                  }
                  disabled={isClosed}
                  placeholder="Describe the underlying reason..."
                />
              </div>
            </div>
          </div>

          <div className="investigation-card">
            <div className="investigation-card-header">
              <div className="investigation-card-icon">⚠️</div>

              <div>
                <h2>Immediate Cause</h2>
                <p>
                  Identify the direct act, condition or failure
                  that led to the incident.
                </p>
              </div>
            </div>

            <div className="investigation-form-group">
              <label>
                What directly caused the incident?
              </label>

              <textarea
                value={immediateCause}
                onChange={(event) =>
                  setImmediateCause(event.target.value)
                }
                disabled={isClosed}
                placeholder="Describe the unsafe act, unsafe condition or immediate failure..."
              />
            </div>
          </div>

          <div className="investigation-card">
            <div className="investigation-card-header">
              <div className="investigation-card-icon">🔎</div>

              <div>
                <h2>Root Cause</h2>
                <p>
                  Identify the underlying system, management or
                  organizational weakness.
                </p>
              </div>
            </div>

            <div className="investigation-form-group">
              <label>
                What underlying failure allowed the incident to
                occur?
              </label>

              <textarea
                value={rootCause}
                onChange={(event) =>
                  setRootCause(event.target.value)
                }
                disabled={isClosed}
                placeholder="Describe the root cause..."
              />
            </div>

            <div className="investigation-form-group">
              <label>Root Cause Category</label>

              <select
                value={rootCauseCategory}
                onChange={(event) =>
                  setRootCauseCategory(event.target.value)
                }
                disabled={isClosed}
              >
                <option value="">Select category</option>

                <option value="Human Factors">
                  Human Factors
                </option>

                <option value="Procedure or System Failure">
                  Procedure or System Failure
                </option>

                <option value="Training or Competency">
                  Training or Competency
                </option>

                <option value="Supervision">
                  Supervision
                </option>

                <option value="Equipment or Material Failure">
                  Equipment or Material Failure
                </option>

                <option value="Maintenance">
                  Maintenance
                </option>

                <option value="Communication">
                  Communication
                </option>

                <option value="Risk Assessment">
                  Risk Assessment
                </option>

                <option value="Management or Organizational">
                  Management or Organizational
                </option>

                <option value="Environmental Conditions">
                  Environmental Conditions
                </option>

                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="investigation-card">
            <div className="investigation-card-header">
              <div className="investigation-card-icon">💡</div>

              <div>
                <h2>Lessons Learned</h2>
                <p>
                  Record the key learning that should be shared
                  with employees and management.
                </p>
              </div>
            </div>

            <div className="investigation-form-group">
              <label>
                What should the organization learn from this
                incident?
              </label>

              <textarea
                value={lessonsLearned}
                onChange={(event) =>
                  setLessonsLearned(event.target.value)
                }
                disabled={isClosed}
                placeholder="Enter lessons learned and preventive learning..."
              />
            </div>
          </div>


          <div className="investigation-card">
            <div className="investigation-card-header">
              <div className="investigation-card-icon">✅</div>

              <div>
                <h2>Corrective Actions</h2>
                <p>
                  Convert the investigation findings into assigned,
                  time-bound actions.
                </p>
              </div>
            </div>

            <div className="corrective-actions-intro">
              Add one or more actions to address the root cause. Each
              action must have a responsible person and target date.
            </div>


            <div className="corrective-progress-panel">
              <div className="corrective-progress-summary">
                <div>
                  <span>Action Completion</span>
                  <strong>
                    {completedActionCount} of{" "}
                    {savedCorrectiveActions.length} completed
                  </strong>
                </div>

                <div className="corrective-progress-percentage">
                  {actionCompletionPercentage}%
                </div>
              </div>

              <div className="corrective-progress-track">
                <div
                  className="corrective-progress-fill"
                  style={{ width: `${actionCompletionPercentage}%` }}
                />
              </div>

              <div className="corrective-progress-stats">
                <span>
                  <strong>{savedCorrectiveActions.length}</strong> Total
                </span>
                <span>
                  <strong>{completedActionCount}</strong> Completed
                </span>
                <span>
                  <strong>{verifiedActionCount}</strong> Verified
                </span>
              </div>
            </div>

            {correctiveActions.length === 0 && (
              <div className="corrective-actions-empty">
                No corrective actions added yet.
              </div>
            )}

            {correctiveActions.map((item, index) => (
              <div className="corrective-action-item" key={item.id || index}>
                <div className="corrective-action-heading">
                  <div>
                    <span>Corrective Action</span>
                    <strong>Action {index + 1}</strong>
                  </div>

                  {!isClosed && (
                    <button
                      type="button"
                      className="corrective-action-remove"
                      onClick={() => removeCorrectiveAction(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="investigation-form-group">
                  <label>Action Required</label>
                  <textarea
                    value={item.action}
                    onChange={(event) =>
                      updateCorrectiveAction(
                        index,
                        "action",
                        event.target.value
                      )
                    }
                    disabled={isClosed}
                    placeholder="Describe the action required to prevent recurrence..."
                  />
                </div>

                <div className="investigation-form-grid">
                  <div className="investigation-form-group">
                    <label>Responsible Person</label>
                    <input
                      type="text"
                      value={item.responsible_person}
                      onChange={(event) =>
                        updateCorrectiveAction(
                          index,
                          "responsible_person",
                          event.target.value
                        )
                      }
                      disabled={isClosed}
                      placeholder="Example: Maintenance Manager"
                    />
                  </div>

                  <div className="investigation-form-group">
                    <label>Target Date</label>
                    <input
                      type="date"
                      value={item.target_date}
                      onChange={(event) =>
                        updateCorrectiveAction(
                          index,
                          "target_date",
                          event.target.value
                        )
                      }
                      disabled={isClosed}
                    />
                  </div>

                  <div className="investigation-form-group">
                    <label>Status</label>
                    <select
                      value={item.status}
                      onChange={(event) =>
                        updateCorrectiveAction(
                          index,
                          "status",
                          event.target.value
                        )
                      }
                      disabled={isClosed}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Verified">Verified</option>
                    </select>
                  </div>
                </div>

                {(item.status === "Completed" ||
                  item.status === "Verified") && (
                  <div className="investigation-form-group">
                    <label>Completion Date</label>
                    <input
                      type="date"
                      value={item.completion_date}
                      onChange={(event) =>
                        updateCorrectiveAction(
                          index,
                          "completion_date",
                          event.target.value
                        )
                      }
                      disabled={isClosed}
                    />
                  </div>
                )}

                <div className="investigation-form-group">
                  <label>Remarks</label>
                  <textarea
                    value={item.remarks}
                    onChange={(event) =>
                      updateCorrectiveAction(
                        index,
                        "remarks",
                        event.target.value
                      )
                    }
                    disabled={isClosed}
                    placeholder="Add progress notes, evidence details or verification comments..."
                  />
                </div>
              </div>
            ))}

            {!isClosed && (
              <button
                type="button"
                className="corrective-action-add"
                onClick={addCorrectiveAction}
              >
                + Add Another Action
              </button>
            )}
          </div>

          {!isClosed && (
            <div className="investigation-actions">
              <button
                type="button"
                className="investigation-cancel-button"
                onClick={() =>
                  navigate(`/incident/${incident.id}`)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="investigation-save-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : investigationId
                  ? "💾 Update Investigation"
                  : "💾 Save Investigation"}
              </button>
            </div>
          )}

          {isClosed && (
            <div className="investigation-readonly-message">
              This incident is closed. The investigation is
              available in read-only mode.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default Investigation;
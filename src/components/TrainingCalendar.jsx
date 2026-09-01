import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  MapPin,
  Clock,
  GraduationCap,
  X,
  Users,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";
import "../styles/TrainingCalendar.css";

function TrainingCalendar() {
  const { user } = useUser();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeModal, setActiveModal] = useState("details");

  const [siteEmployees, setSiteEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [completionRemarks, setCompletionRemarks] = useState("");

  const [notDoneReason, setNotDoneReason] = useState("");
  const [shouldReschedule, setShouldReschedule] = useState(false);
  const [rescheduledDate, setRescheduledDate] = useState("");
  const [notDoneSaving, setNotDoneSaving] = useState(false);

  const [workflowMessage, setWorkflowMessage] = useState("");

  useEffect(() => {
    loadTrainingSessions();
  }, []);

  async function loadTrainingSessions() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("training_sessions")
      .select(`
        id,
        training_type_id,
        site_id,
        title,
        trainer_name,
        session_date,
        start_time,
        end_time,
        venue,
        status,
        frequency,
        repeat_until,
        reminder_days,
        responsible_user_id,
        responsible_email,
        session_category,
        remarks,
        planned_participants,
        completed_date,
        non_completion_reason,
        rescheduled_date,
        original_session_id,
        participant_count,
        present_count,
        absent_count,
        sites (
          name
        ),
        training_types (
          name
        )
      `)
      .order("session_date", { ascending: true });

    if (error) {
      console.error("Training calendar loading failed:", error);
      setErrorMessage(error.message);
      setSessions([]);
      setLoading(false);
      return;
    }

    setSessions(data || []);
    setLoading(false);
  }

  function getDisplayStatus(session) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventDate = new Date(
      `${session.session_date}T00:00:00`
    );

    const finishedStatuses = [
      "Completed",
      "Cancelled",
      "Rescheduled",
      "Not Conducted",
    ];

    if (
      eventDate < today &&
      !finishedStatuses.includes(session.status)
    ) {
      return "Overdue";
    }

    if (
      eventDate.getTime() === today.getTime() &&
      session.status === "Scheduled"
    ) {
      return "Due Today";
    }

    return session.status || "Scheduled";
  }

  function getEventColours(status) {
    switch (status) {
      case "Completed":
        return {
          backgroundColor: "#27845c",
          borderColor: "#27845c",
          textColor: "#ffffff",
        };

      case "Overdue":
      case "Not Conducted":
        return {
          backgroundColor: "#c93d3d",
          borderColor: "#c93d3d",
          textColor: "#ffffff",
        };

      case "Due Today":
      case "Due Soon":
        return {
          backgroundColor: "#eaa840",
          borderColor: "#eaa840",
          textColor: "#111827",
        };

      case "Rescheduled":
      case "Postponed":
        return {
          backgroundColor: "#7157a8",
          borderColor: "#7157a8",
          textColor: "#ffffff",
        };

      case "Cancelled":
        return {
          backgroundColor: "#6b7280",
          borderColor: "#6b7280",
          textColor: "#ffffff",
        };

      default:
        return {
          backgroundColor: "#315b92",
          borderColor: "#315b92",
          textColor: "#ffffff",
        };
    }
  }

  function formatTime(time) {
    if (!time) {
      return "Time not set";
    }

    const [hours, minutes] = time.split(":");
    const date = new Date();

    date.setHours(
      Number(hours),
      Number(minutes),
      0,
      0
    );

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatDate(dateValue) {
    if (!dateValue) {
      return "Date not set";
    }

    const date = new Date(
      `${dateValue}T00:00:00`
    );

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function getEmployeeName(employee) {
    return (
      employee.full_name ||
      employee.name ||
      employee.employee_name ||
      employee.email ||
      `Employee #${employee.id}`
    );
  }

  function getEmployeeDesignation(employee) {
    return (
      employee.designation ||
      employee.position ||
      employee.job_title ||
      employee.department ||
      "Designation not entered"
    );
  }

  const calendarEvents = useMemo(() => {
    return sessions.map((session) => {
      const displayStatus = getDisplayStatus(session);
      const colours = getEventColours(displayStatus);

      return {
        id: String(session.id),
        title: session.title,
        start: session.session_date,
        allDay: true,

        backgroundColor: colours.backgroundColor,
        borderColor: colours.borderColor,
        textColor: colours.textColor,

        extendedProps: {
          ...session,
          displayStatus,

          siteName:
            session.sites?.name ||
            "Site not assigned",

          trainingType:
            session.training_types?.name ||
            "Training",
        },
      };
    });
  }, [sessions]);

  function handleEventClick(info) {
    setSelectedEvent({
      id: Number(info.event.id),
      title: info.event.title,
      date: info.event.startStr,
      ...info.event.extendedProps,
    });

    setActiveModal("details");
    resetWorkflowForms();
  }

  function resetWorkflowForms() {
    setSiteEmployees([]);
    setAttendance({});
    setCompletionRemarks("");
    setNotDoneReason("");
    setShouldReschedule(false);
    setRescheduledDate("");
    setWorkflowMessage("");
  }

  function closeAllModals() {
    setSelectedEvent(null);
    setActiveModal("details");
    resetWorkflowForms();
  }

  async function openAttendanceModal() {
    if (!selectedEvent?.site_id) {
      setWorkflowMessage(
        "This training does not have an assigned site."
      );
      return;
    }

    setActiveModal("attendance");
    setAttendanceLoading(true);
    setWorkflowMessage("");

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("site_id", selectedEvent.site_id)
      .order("id", { ascending: true });

    if (error) {
      console.error("Employee loading failed:", error);
      setWorkflowMessage(error.message);
      setSiteEmployees([]);
      setAttendanceLoading(false);
      return;
    }

    const employees = data || [];
    const initialAttendance = {};

    employees.forEach((employee) => {
      initialAttendance[employee.id] = {
        status: "Present",
        absenceReason: "",
        remarks: "",
      };
    });

    setSiteEmployees(employees);
    setAttendance(initialAttendance);
    setAttendanceLoading(false);
  }

  function updateAttendanceStatus(employeeId, status) {
    setAttendance((current) => ({
      ...current,
      [employeeId]: {
        ...current[employeeId],
        status,
        absenceReason:
          status === "Present"
            ? ""
            : current[employeeId]?.absenceReason || "",
      },
    }));
  }

  function updateAbsenceReason(employeeId, value) {
    setAttendance((current) => ({
      ...current,
      [employeeId]: {
        ...current[employeeId],
        absenceReason: value,
      },
    }));
  }

  async function saveAttendance() {
    if (!selectedEvent) {
      return;
    }

    if (siteEmployees.length === 0) {
      setWorkflowMessage(
        "No employees are assigned to this site."
      );
      return;
    }

    const absentWithoutReason = siteEmployees.find(
      (employee) =>
        attendance[employee.id]?.status === "Absent" &&
        !attendance[employee.id]?.absenceReason?.trim()
    );

    if (absentWithoutReason) {
      setWorkflowMessage(
        `Please enter an absence reason for ${getEmployeeName(
          absentWithoutReason
        )}.`
      );
      return;
    }

    setAttendanceSaving(true);
    setWorkflowMessage("");

    const attendanceRows = siteEmployees.map(
      (employee) => ({
        session_id: selectedEvent.id,
        employee_id: employee.id,

        attendance_status:
          attendance[employee.id]?.status || "Present",

        absence_reason:
          attendance[employee.id]?.status === "Absent"
            ? attendance[
                employee.id
              ]?.absenceReason?.trim() || null
            : null,

        remarks:
          attendance[employee.id]?.remarks || null,

        recorded_by: user?.id || null,
        recorded_at: new Date().toISOString(),
      })
    );

    const { error: attendanceError } = await supabase
      .from("training_attendance")
      .upsert(attendanceRows, {
        onConflict: "session_id,employee_id",
      });

    if (attendanceError) {
      console.error(
        "Attendance saving failed:",
        attendanceError
      );

      setWorkflowMessage(attendanceError.message);
      setAttendanceSaving(false);
      return;
    }

    const presentCount = attendanceRows.filter(
      (row) => row.attendance_status === "Present"
    ).length;

    const absentCount = attendanceRows.filter(
      (row) => row.attendance_status === "Absent"
    ).length;

    const { error: sessionError } = await supabase
      .from("training_sessions")
      .update({
        status: "Completed",
        completed_date: new Date()
          .toISOString()
          .slice(0, 10),

        participant_count: attendanceRows.length,
        present_count: presentCount,
        absent_count: absentCount,

        completion_updated_by: user?.id || null,

        remarks:
          completionRemarks.trim() ||
          selectedEvent.remarks ||
          null,

        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedEvent.id);

    if (sessionError) {
      console.error(
        "Training completion update failed:",
        sessionError
      );

      setWorkflowMessage(sessionError.message);
      setAttendanceSaving(false);
      return;
    }

    setAttendanceSaving(false);
    closeAllModals();
    await loadTrainingSessions();
  }

  function openNotDoneModal() {
    setActiveModal("not-done");
    setWorkflowMessage("");
  }

  async function saveNotDoneUpdate() {
    if (!selectedEvent) {
      return;
    }

    if (!notDoneReason.trim()) {
      setWorkflowMessage(
        "Please enter the reason the training was not conducted."
      );
      return;
    }

    if (shouldReschedule && !rescheduledDate) {
      setWorkflowMessage(
        "Please select the new rescheduled date."
      );
      return;
    }

    if (
      shouldReschedule &&
      rescheduledDate <= selectedEvent.session_date
    ) {
      setWorkflowMessage(
        "The new date must be later than the original training date."
      );
      return;
    }

    setNotDoneSaving(true);
    setWorkflowMessage("");

    const currentStatus = shouldReschedule
      ? "Rescheduled"
      : "Not Conducted";

    const { error: updateError } = await supabase
      .from("training_sessions")
      .update({
        status: currentStatus,
        non_completion_reason:
          notDoneReason.trim(),

        rescheduled_date:
          shouldReschedule
            ? rescheduledDate
            : null,

        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedEvent.id);

    if (updateError) {
      console.error(
        "Not conducted update failed:",
        updateError
      );

      setWorkflowMessage(updateError.message);
      setNotDoneSaving(false);
      return;
    }

    if (shouldReschedule) {
      const replacementSession = {
        training_type_id:
          selectedEvent.training_type_id || null,

        site_id:
          selectedEvent.site_id || null,

        title: selectedEvent.title,

        trainer_name:
          selectedEvent.trainer_name || null,

        session_date: rescheduledDate,

        start_time:
          selectedEvent.start_time || null,

        end_time:
          selectedEvent.end_time || null,

        venue:
          selectedEvent.venue || null,

        status: "Scheduled",

        frequency: "One Time",

        reminder_days:
          selectedEvent.reminder_days ||
          [7, 3, 1],

        responsible_user_id:
          selectedEvent.responsible_user_id ||
          null,

        responsible_email:
          selectedEvent.responsible_email ||
          null,

        session_category:
          selectedEvent.session_category ||
          "Formal Training",

        remarks:
          `Rescheduled from ${formatDate(
            selectedEvent.session_date
          )}. Reason: ${notDoneReason.trim()}`,

        original_session_id:
          selectedEvent.id,
      };

      const { error: insertError } = await supabase
        .from("training_sessions")
        .insert(replacementSession);

      if (insertError) {
        console.error(
          "Rescheduled session creation failed:",
          insertError
        );

        setWorkflowMessage(insertError.message);
        setNotDoneSaving(false);
        return;
      }
    }

    setNotDoneSaving(false);
    closeAllModals();
    await loadTrainingSessions();
  }

  return (
    <>
      <section className="training-section">
        <div className="training-section-heading">
          <div>
            <span>Live Schedule</span>

            <h2>Training Calendar</h2>

            <p>
              Training dates, locations, times and
              current status.
            </p>
          </div>

          <button
            type="button"
            className="training-link-button"
            onClick={loadTrainingSessions}
          >
            Refresh Calendar
          </button>
        </div>

        <div className="training-calendar-shell">
          <div className="training-calendar-legend">
            <span>
              <i className="scheduled" />
              Scheduled
            </span>

            <span>
              <i className="completed" />
              Completed
            </span>

            <span>
              <i className="due" />
              Due Today
            </span>

            <span>
              <i className="overdue" />
              Overdue
            </span>
          </div>

          {loading && (
            <div className="training-calendar-loading">
              Loading training schedule...
            </div>
          )}

          {!loading && errorMessage && (
            <div className="training-calendar-loading">
              Database error: {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && (
            <FullCalendar
              plugins={[
                dayGridPlugin,
                interactionPlugin,
              ]}
              initialView="dayGridMonth"
              initialDate="2026-08-01"
              firstDay={1}
              height="auto"
              fixedWeekCount={false}
              dayMaxEvents={2}
              events={calendarEvents}
              eventClick={handleEventClick}
              eventContent={(info) => {
                const props =
                  info.event.extendedProps;

                return (
                  <div className="training-calendar-event">
                    <div className="training-calendar-event-title">
                      <GraduationCap size={13} />

                      <span>
                        {info.event.title}
                      </span>
                    </div>

                    <div className="training-calendar-event-meta">
                      <span>
                        <MapPin size={11} />
                        {props.siteName}
                      </span>

                      <span>
                        <Clock size={11} />
                        {formatTime(
                          props.start_time
                        )}
                      </span>
                    </div>

                    <small>
                      {props.displayStatus}
                    </small>
                  </div>
                );
              }}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "",
              }}
            />
          )}
        </div>
      </section>

      {/* EVENT DETAILS */}

      {selectedEvent &&
        activeModal === "details" && (
          <div
            className="training-event-modal-overlay"
            onMouseDown={closeAllModals}
          >
            <div
              className="training-event-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <div className="training-event-modal-header">
                <div>
                  <span>
                    {selectedEvent.trainingType}
                  </span>

                  <h2>
                    {selectedEvent.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeAllModals}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="training-event-modal-status">
                {selectedEvent.displayStatus}
              </div>

              <div className="training-event-detail-grid">
                <div>
                  <span>Site</span>
                  <strong>
                    {selectedEvent.siteName}
                  </strong>
                </div>

                <div>
                  <span>Date</span>
                  <strong>
                    {formatDate(
                      selectedEvent.session_date
                    )}
                  </strong>
                </div>

                <div>
                  <span>Start Time</span>
                  <strong>
                    {formatTime(
                      selectedEvent.start_time
                    )}
                  </strong>
                </div>

                <div>
                  <span>End Time</span>
                  <strong>
                    {formatTime(
                      selectedEvent.end_time
                    )}
                  </strong>
                </div>

                <div>
                  <span>Trainer</span>
                  <strong>
                    {selectedEvent.trainer_name ||
                      "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>Venue</span>
                  <strong>
                    {selectedEvent.venue ||
                      "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>Frequency</span>
                  <strong>
                    {selectedEvent.frequency ||
                      "One Time"}
                  </strong>
                </div>

                <div>
                  <span>Category</span>
                  <strong>
                    {selectedEvent.session_category ||
                      "Formal Training"}
                  </strong>
                </div>
              </div>

              {workflowMessage && (
                <div className="training-workflow-message">
                  {workflowMessage}
                </div>
              )}

              <div className="training-event-modal-actions">
                <button
                  type="button"
                  className="training-event-close-button"
                  onClick={closeAllModals}
                >
                  Close
                </button>

                <button
                  type="button"
                  className="training-event-not-done-button"
                  onClick={openNotDoneModal}
                >
                  Not Done
                </button>

                <button
                  type="button"
                  className="training-event-done-button"
                  onClick={openAttendanceModal}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ATTENDANCE */}

      {selectedEvent &&
        activeModal === "attendance" && (
          <div
            className="training-event-modal-overlay"
            onMouseDown={closeAllModals}
          >
            <div
              className="training-event-modal training-attendance-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <div className="training-event-modal-header">
                <div>
                  <span>Training Completion</span>
                  <h2>Attendance Sheet</h2>
                </div>

                <button
                  type="button"
                  onClick={closeAllModals}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="training-selected-session">
                <Users size={20} />

                <div>
                  <span>Selected Training</span>
                  <strong>
                    {selectedEvent.title} —{" "}
                    {selectedEvent.siteName}
                  </strong>
                </div>
              </div>

              {attendanceLoading ? (
                <div className="training-calendar-loading">
                  Loading site employees...
                </div>
              ) : siteEmployees.length === 0 ? (
                <div className="training-empty-state compact">
                  <div>!</div>
                  <h3>No site employees found</h3>
                  <p>
                    Add employees to this site before
                    recording attendance.
                  </p>
                </div>
              ) : (
                <div className="training-attendance-table">
                  <div className="training-attendance-header">
                    <span>Employee</span>
                    <span>Status</span>
                    <span>Absence reason</span>
                  </div>

                  {siteEmployees.map((employee) => {
                    const employeeAttendance =
                      attendance[employee.id] || {
                        status: "Present",
                        absenceReason: "",
                      };

                    return (
                      <div
                        className="training-attendance-row"
                        key={employee.id}
                      >
                        <div className="training-attendance-employee">
                          <strong>
                            {getEmployeeName(employee)}
                          </strong>

                          <span>
                            {getEmployeeDesignation(
                              employee
                            )}
                          </span>
                        </div>

                        <div className="training-attendance-options">
                          <label>
                            <input
                              type="radio"
                              name={`attendance-${employee.id}`}
                              checked={
                                employeeAttendance.status ===
                                "Present"
                              }
                              onChange={() =>
                                updateAttendanceStatus(
                                  employee.id,
                                  "Present"
                                )
                              }
                            />

                            Present
                          </label>

                          <label>
                            <input
                              type="radio"
                              name={`attendance-${employee.id}`}
                              checked={
                                employeeAttendance.status ===
                                "Absent"
                              }
                              onChange={() =>
                                updateAttendanceStatus(
                                  employee.id,
                                  "Absent"
                                )
                              }
                            />

                            Absent
                          </label>
                        </div>

                        <input
                          type="text"
                          className="training-absence-input"
                          value={
                            employeeAttendance.absenceReason
                          }
                          disabled={
                            employeeAttendance.status !==
                            "Absent"
                          }
                          onChange={(event) =>
                            updateAbsenceReason(
                              employee.id,
                              event.target.value
                            )
                          }
                          placeholder={
                            employeeAttendance.status ===
                            "Absent"
                              ? "Reason required"
                              : "Not required"
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <label className="training-workflow-field">
                <span>Completion remarks</span>

                <textarea
                  rows="3"
                  value={completionRemarks}
                  onChange={(event) =>
                    setCompletionRemarks(
                      event.target.value
                    )
                  }
                  placeholder="Optional completion remarks"
                />
              </label>

              {workflowMessage && (
                <div className="training-workflow-message">
                  {workflowMessage}
                </div>
              )}

              <div className="training-event-modal-actions">
                <button
                  type="button"
                  className="training-event-close-button"
                  onClick={() =>
                    setActiveModal("details")
                  }
                  disabled={attendanceSaving}
                >
                  Back
                </button>

                <button
                  type="button"
                  className="training-event-done-button"
                  onClick={saveAttendance}
                  disabled={
                    attendanceSaving ||
                    attendanceLoading ||
                    siteEmployees.length === 0
                  }
                >
                  {attendanceSaving
                    ? "Saving..."
                    : "Save Attendance"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* NOT DONE / RESCHEDULE */}

      {selectedEvent &&
        activeModal === "not-done" && (
          <div
            className="training-event-modal-overlay"
            onMouseDown={closeAllModals}
          >
            <div
              className="training-event-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <div className="training-event-modal-header">
                <div>
                  <span>Completion Update</span>
                  <h2>
                    Training Not Conducted
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeAllModals}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="training-selected-session warning">
                <AlertTriangle size={20} />

                <div>
                  <span>Selected Training</span>
                  <strong>
                    {selectedEvent.title} —{" "}
                    {selectedEvent.siteName}
                  </strong>
                </div>
              </div>

              <label className="training-workflow-field">
                <span>
                  Reason not conducted *
                </span>

                <textarea
                  rows="4"
                  value={notDoneReason}
                  onChange={(event) =>
                    setNotDoneReason(
                      event.target.value
                    )
                  }
                  placeholder="Explain why the training was not conducted"
                />
              </label>

              <label className="training-reschedule-option">
                <input
                  type="checkbox"
                  checked={shouldReschedule}
                  onChange={(event) => {
                    setShouldReschedule(
                      event.target.checked
                    );

                    if (!event.target.checked) {
                      setRescheduledDate("");
                    }
                  }}
                />

                <span>
                  Reschedule this training
                </span>
              </label>

              {shouldReschedule && (
                <label className="training-workflow-field">
                  <span>New training date *</span>

                  <input
                    type="date"
                    min={selectedEvent.session_date}
                    value={rescheduledDate}
                    onChange={(event) =>
                      setRescheduledDate(
                        event.target.value
                      )
                    }
                  />
                </label>
              )}

              {workflowMessage && (
                <div className="training-workflow-message">
                  {workflowMessage}
                </div>
              )}

              <div className="training-event-modal-actions">
                <button
                  type="button"
                  className="training-event-close-button"
                  onClick={() =>
                    setActiveModal("details")
                  }
                  disabled={notDoneSaving}
                >
                  Back
                </button>

                <button
                  type="button"
                  className="training-event-not-done-button"
                  onClick={saveNotDoneUpdate}
                  disabled={notDoneSaving}
                >
                  {notDoneSaving
                    ? "Saving..."
                    : shouldReschedule
                    ? "Save & Reschedule"
                    : "Save as Not Conducted"}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}

export default TrainingCalendar;
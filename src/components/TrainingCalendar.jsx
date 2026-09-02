import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  MapPin,
  Clock,
  GraduationCap,
  X,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";
import "../styles/TrainingCalendar.css";

const emptyAttendanceRow = () => ({
  participant_name: "",
  participant_designation: "",
  participant_company: "PEPL",
  attendance_status: "Present",
  absence_reason: "",
});

function TrainingCalendar({ selectedSiteId, openSessionId }) {
  const { user } = useUser();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeModal, setActiveModal] = useState("details");

  const [attendanceRows, setAttendanceRows] = useState([
    emptyAttendanceRow(),
  ]);

  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  const [completionRemarks, setCompletionRemarks] = useState("");

  const [notDoneReason, setNotDoneReason] = useState("");
  const [shouldReschedule, setShouldReschedule] = useState(false);
  const [rescheduledDate, setRescheduledDate] = useState("");
  const [notDoneSaving, setNotDoneSaving] = useState(false);

  const [workflowMessage, setWorkflowMessage] = useState("");

  /*
    LOAD TRAINING SESSIONS

    selectedSiteId comes from Training.jsx.

    If a site is selected:
    → only that site's training sessions are loaded.

    If no site is selected:
    → all sessions are loaded.

    Training.jsx should already restrict non-admin users
    to their assigned site.
  */
  useEffect(() => {
    loadTrainingSessions();
  }, [selectedSiteId]);

  useEffect(() => {
  if (!openSessionId || sessions.length === 0) {
    return;
  }

  const session = sessions.find(
    (item) =>
      String(item.id) ===
      String(openSessionId)
  );

  if (!session) {
    return;
  }

  const eventData = {
    id: Number(session.id),
    title: session.title,
    date: session.session_date,
    ...session,
    displayStatus:
      getDisplayStatus(session),
    siteName:
      session.sites?.name ||
      "Site not assigned",
    trainingType:
      session.training_types?.name ||
      "Training",
  };

  setSelectedEvent(eventData);
  setActiveModal("details");
  setWorkflowMessage("");
  setCompletionRemarks(
    session.remarks || ""
  );

  if (session.status === "Completed") {
    loadExistingAttendance(
      Number(session.id)
    );
  } else {
    setAttendanceRows([
      emptyAttendanceRow(),
    ]);
  }
}, [openSessionId, sessions]);

  async function loadTrainingSessions() {
    setLoading(true);
    setErrorMessage("");

    let query = supabase
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

    if (
  selectedSiteId &&
  selectedSiteId !== "all"
) {
  query = query.eq(
    "site_id",
    selectedSiteId
  );
}

    const { data, error } = await query;

    if (error) {
      console.error(
        "Training calendar loading failed:",
        error
      );

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

  /*
    CREATE FULLCALENDAR EVENTS
  */
  const calendarEvents = useMemo(() => {
    return sessions.map((session) => {
      const displayStatus =
        getDisplayStatus(session);

      const colours =
        getEventColours(displayStatus);

      return {
        id: String(session.id),

        title: session.title,

        start: session.session_date,

        allDay: true,

        backgroundColor:
          colours.backgroundColor,

        borderColor:
          colours.borderColor,

        textColor:
          colours.textColor,

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

  /*
    WHEN USER CLICKS A CALENDAR EVENT

    We load the session details AND check whether
    attendance already exists.
  */
  async function handleEventClick(info) {
    const sessionId = Number(info.event.id);

    const eventData = {
      id: sessionId,

      title: info.event.title,

      date: info.event.startStr,

      ...info.event.extendedProps,
    };

    setSelectedEvent(eventData);

    setActiveModal("details");

    setWorkflowMessage("");

    setCompletionRemarks(
      eventData.remarks || ""
    );

    /*
      If the session is already completed,
      automatically load its saved attendance.
    */
    if (eventData.status === "Completed") {
      await loadExistingAttendance(sessionId);
    } else {
      setAttendanceRows([
        emptyAttendanceRow(),
      ]);
    }
  }

  /*
    LOAD SAVED ATTENDANCE FROM SUPABASE
  */
  async function loadExistingAttendance(
    sessionId
  ) {
    setAttendanceLoading(true);
    setWorkflowMessage("");

    const { data, error } = await supabase
      .from("training_attendance")
      .select(`
        participant_name,
        participant_designation,
        participant_company,
        attendance_status,
        absence_reason
      `)
      .eq("session_id", sessionId)
      .order("id", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Attendance loading failed:",
        error
      );

      setAttendanceRows([
        emptyAttendanceRow(),
      ]);

      setWorkflowMessage(
        `Attendance could not be loaded: ${error.message}`
      );

      setAttendanceLoading(false);

      return;
    }

    if (data && data.length > 0) {
      setAttendanceRows(
        data.map((row) => ({
          participant_name:
            row.participant_name || "",

          participant_designation:
            row.participant_designation || "",

          participant_company:
            row.participant_company ||
            "PEPL",

          attendance_status:
            row.attendance_status ||
            "Present",

          absence_reason:
            row.absence_reason || "",
        }))
      );
    } else {
      /*
        Completed session but no attendance rows.
        Keep one blank row so the user can add them.
      */
      setAttendanceRows([
        emptyAttendanceRow(),
      ]);
    }

    setAttendanceLoading(false);
  }

  /*
    RESET WORKFLOW FORMS
  */
  function resetWorkflowForms() {
    setAttendanceRows([
      emptyAttendanceRow(),
    ]);

    setCompletionRemarks("");

    setNotDoneReason("");

    setShouldReschedule(false);

    setRescheduledDate("");

    setWorkflowMessage("");

    setAttendanceLoading(false);
  }

  function closeAllModals() {
    setSelectedEvent(null);

    setActiveModal("details");

    resetWorkflowForms();
  }

  /*
    ATTENDANCE ROW FUNCTIONS
  */
  function addAttendanceRow() {
    setAttendanceRows((current) => [
      ...current,
      emptyAttendanceRow(),
    ]);
  }

  function removeAttendanceRow(index) {
    setAttendanceRows((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter(
        (_, rowIndex) =>
          rowIndex !== index
      );
    });
  }

  function updateAttendanceRow(
    index,
    field,
    value
  ) {
    setAttendanceRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        const updatedRow = {
          ...row,
          [field]: value,
        };

        if (
          field ===
            "attendance_status" &&
          value === "Present"
        ) {
          updatedRow.absence_reason = "";
        }

        return updatedRow;
      })
    );
  }

  /*
    OPEN ATTENDANCE MODAL

    For completed sessions:
    → load existing attendance

    For new sessions:
    → blank attendance sheet
  */
  async function openAttendanceModal() {
    if (!selectedEvent) {
      return;
    }

    setWorkflowMessage("");

    setCompletionRemarks(
      selectedEvent.remarks || ""
    );

    if (
      selectedEvent.status ===
      "Completed"
    ) {
      await loadExistingAttendance(
        selectedEvent.id
      );
    } else {
      setAttendanceRows([
        emptyAttendanceRow(),
      ]);
    }

    setActiveModal("attendance");
  }

  /*
    SAVE / UPDATE ATTENDANCE
  */
  async function saveAttendance() {
    if (!selectedEvent) {
      return;
    }

    const validRows =
      attendanceRows.filter((row) =>
        row.participant_name.trim()
      );

    if (validRows.length === 0) {
      setWorkflowMessage(
        "Please enter at least one participant name."
      );

      return;
    }

    const incompleteRow =
      validRows.find(
        (row) =>
          !row.participant_designation.trim()
      );

    if (incompleteRow) {
      setWorkflowMessage(
        "Please enter the designation for every participant."
      );

      return;
    }

    const absentWithoutReason =
      validRows.find(
        (row) =>
          row.attendance_status ===
            "Absent" &&
          !row.absence_reason.trim()
      );

    if (absentWithoutReason) {
      setWorkflowMessage(
        `Please enter an absence reason for ${absentWithoutReason.participant_name}.`
      );

      return;
    }

    setAttendanceSaving(true);
    setWorkflowMessage("");

    const attendanceData =
      validRows.map((row) => ({
        session_id:
          selectedEvent.id,

        employee_id: null,

        participant_name:
          row.participant_name.trim(),

        participant_designation:
          row.participant_designation.trim(),

        participant_company:
          row.participant_company.trim() ||
          "PEPL",

        attendance_status:
          row.attendance_status,

        absence_reason:
          row.attendance_status ===
          "Absent"
            ? row.absence_reason.trim()
            : null,

        remarks: null,

        recorded_by:
          user?.id || null,

        recorded_at:
          new Date().toISOString(),
      }));

    /*
      DELETE OLD RECORDS FIRST.

      This allows the user to edit attendance
      and save the updated sheet without creating
      duplicate attendance records.
    */
    const {
      error: deleteError,
    } = await supabase
      .from("training_attendance")
      .delete()
      .eq(
        "session_id",
        selectedEvent.id
      );

    if (deleteError) {
      console.error(
        "Old attendance deletion failed:",
        deleteError
      );

      setWorkflowMessage(
        deleteError.message
      );

      setAttendanceSaving(false);

      return;
    }

    /*
      INSERT UPDATED ATTENDANCE
    */
    const {
      error: attendanceError,
    } = await supabase
      .from("training_attendance")
      .insert(attendanceData);

    if (attendanceError) {
      console.error(
        "Attendance saving failed:",
        attendanceError
      );

      setWorkflowMessage(
        attendanceError.message
      );

      setAttendanceSaving(false);

      return;
    }

    /*
      CALCULATE COUNTS
    */
    const presentCount =
      attendanceData.filter(
        (row) =>
          row.attendance_status ===
          "Present"
      ).length;

    const absentCount =
      attendanceData.filter(
        (row) =>
          row.attendance_status ===
          "Absent"
      ).length;

    /*
      MARK SESSION COMPLETED

      This works for both:
      - first-time completion
      - editing an already completed session
    */
    const {
      error: sessionError,
    } = await supabase
      .from("training_sessions")
      .update({
        status: "Completed",

        completed_date:
          selectedEvent.completed_date ||
          new Date()
            .toISOString()
            .slice(0, 10),

        participant_count:
          attendanceData.length,

        present_count:
          presentCount,

        absent_count:
          absentCount,

        completion_updated_by:
          user?.id || null,

        remarks:
          completionRemarks.trim() ||
          selectedEvent.remarks ||
          null,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        selectedEvent.id
      );

    if (sessionError) {
      console.error(
        "Training completion update failed:",
        sessionError
      );

      setWorkflowMessage(
        sessionError.message
      );

      setAttendanceSaving(false);

      return;
    }

    setAttendanceSaving(false);

    closeAllModals();

    await loadTrainingSessions();
  }

  /*
    SAVE NOT CONDUCTED / RESCHEDULE
  */
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

    if (
      shouldReschedule &&
      !rescheduledDate
    ) {
      setWorkflowMessage(
        "Please select the new rescheduled date."
      );

      return;
    }

    if (
      shouldReschedule &&
      rescheduledDate <=
        selectedEvent.session_date
    ) {
      setWorkflowMessage(
        "The new date must be later than the original date."
      );

      return;
    }

    setNotDoneSaving(true);
    setWorkflowMessage("");

    const newStatus =
      shouldReschedule
        ? "Rescheduled"
        : "Not Conducted";

    const {
      error: updateError,
    } = await supabase
      .from("training_sessions")
      .update({
        status: newStatus,

        non_completion_reason:
          notDoneReason.trim(),

        rescheduled_date:
          shouldReschedule
            ? rescheduledDate
            : null,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        selectedEvent.id
      );

    if (updateError) {
      console.error(
        "Not conducted update failed:",
        updateError
      );

      setWorkflowMessage(
        updateError.message
      );

      setNotDoneSaving(false);

      return;
    }

    /*
      IF RESCHEDULED, CREATE THE NEW SESSION
    */
    if (shouldReschedule) {
      const {
        error: insertError,
      } = await supabase
        .from("training_sessions")
        .insert({
          training_type_id:
            selectedEvent.training_type_id ||
            null,

          site_id:
            selectedEvent.site_id ||
            null,

          title:
            selectedEvent.title,

          trainer_name:
            selectedEvent.trainer_name ||
            null,

          session_date:
            rescheduledDate,

          start_time:
            selectedEvent.start_time ||
            null,

          end_time:
            selectedEvent.end_time ||
            null,

          venue:
            selectedEvent.venue ||
            null,

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

          remarks: `Rescheduled from ${formatDate(
            selectedEvent.session_date
          )}. Reason: ${notDoneReason.trim()}`,

          original_session_id:
            selectedEvent.id,
        });

      if (insertError) {
        console.error(
          "Rescheduled session creation failed:",
          insertError
        );

        setWorkflowMessage(
          insertError.message
        );

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
              Training dates, locations, times
              and current status.
            </p>
          </div>

          <button
            type="button"
            className="training-link-button"
            onClick={
              loadTrainingSessions
            }
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

          {!loading &&
            errorMessage && (
              <div className="training-calendar-loading">
                Database error:{" "}
                {errorMessage}
              </div>
            )}

          {!loading &&
            !errorMessage && (
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
                eventClick={
                  handleEventClick
                }
                eventContent={(info) => {
                  const props =
                    info.event
                      .extendedProps;

                  return (
                    <div className="training-calendar-event">
                      <div className="training-calendar-event-title">
                        <GraduationCap
                          size={13}
                        />

                        <span>
                          {info.event.title}
                        </span>
                      </div>

                      <div className="training-calendar-event-meta">
                        <span>
                          <MapPin
                            size={11}
                          />

                          {props.siteName}
                        </span>

                        <span>
                          <Clock
                            size={11}
                          />

                          {formatTime(
                            props.start_time
                          )}
                        </span>
                      </div>

                      <small>
                        {
                          props.displayStatus
                        }
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

      {/* =====================================================
          DETAILS MODAL
      ===================================================== */}

      {selectedEvent &&
        activeModal === "details" && (
          <div
            className="training-event-modal-overlay"
            onMouseDown={
              closeAllModals
            }
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
                    {
                      selectedEvent.trainingType
                    }
                  </span>

                  <h2>
                    {selectedEvent.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    closeAllModals
                  }
                >
                  <X size={20} />
                </button>
              </div>

              <div className="training-event-modal-status">
                {
                  selectedEvent.displayStatus
                }
              </div>

              <div className="training-event-detail-grid">
                <div>
                  <span>Site</span>

                  <strong>
                    {
                      selectedEvent.siteName
                    }
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
                    {
                      selectedEvent.trainer_name ||
                      "Not specified"
                    }
                  </strong>
                </div>

                <div>
                  <span>Venue</span>

                  <strong>
                    {
                      selectedEvent.venue ||
                      "Not specified"
                    }
                  </strong>
                </div>

                <div>
                  <span>Frequency</span>

                  <strong>
                    {
                      selectedEvent.frequency ||
                      "One Time"
                    }
                  </strong>
                </div>

                <div>
                  <span>Category</span>

                  <strong>
                    {
                      selectedEvent.session_category ||
                      "Formal Training"
                    }
                  </strong>
                </div>

                {selectedEvent.status ===
                  "Completed" && (
                  <>
                    <div>
                      <span>
                        Participants
                      </span>

                      <strong>
                        {
                          selectedEvent.participant_count ??
                          0
                        }
                      </strong>
                    </div>

                    <div>
                      <span>Present</span>

                      <strong>
                        {
                          selectedEvent.present_count ??
                          0
                        }
                      </strong>
                    </div>

                    <div>
                      <span>Absent</span>

                      <strong>
                        {
                          selectedEvent.absent_count ??
                          0
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Completed Date
                      </span>

                      <strong>
                        {selectedEvent.completed_date
                          ? formatDate(
                              selectedEvent.completed_date
                            )
                          : "Not specified"}
                      </strong>
                    </div>
                  </>
                )}
              </div>

              <div className="training-event-modal-actions">
                <button
                  type="button"
                  className="training-event-close-button"
                  onClick={
                    closeAllModals
                  }
                >
                  Close
                </button>

                {selectedEvent.status !== "Completed" && (
  <button
    type="button"
    className="training-event-not-done-button"
    onClick={() => {
      setActiveModal("not-done");
      setWorkflowMessage("");
    }}
  >
    Not Done
  </button>
)}

                <button
                  type="button"
                  className="training-event-done-button"
                  onClick={
                    openAttendanceModal
                  }
                >
                  {selectedEvent.status ===
                  "Completed"
                    ? "View Attendance"
                    : "Done"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          ATTENDANCE MODAL
      ===================================================== */}

      {selectedEvent &&
        activeModal === "attendance" && (
          <div
            className="training-event-modal-overlay"
            onMouseDown={
              closeAllModals
            }
          >
            <div
              className="training-event-modal training-attendance-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <div className="training-event-modal-header">
                <div>
                  <span>
                    {selectedEvent.status ===
                    "Completed"
                      ? "Saved Training Record"
                      : "Training Completion"}
                  </span>

                  <h2>
                    Attendance Sheet
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    closeAllModals
                  }
                >
                  <X size={20} />
                </button>
              </div>

              <div className="training-selected-session">
                <div>
                  <span>
                    Selected Training
                  </span>

                  <strong>
                    {selectedEvent.title} —{" "}
                    {
                      selectedEvent.siteName
                    }
                  </strong>
                </div>
              </div>

              {attendanceLoading ? (
                <div className="training-calendar-loading">
                  Loading saved attendance...
                </div>
              ) : (
                <>
                  <div className="training-manual-attendance-table">
                    <div className="training-manual-attendance-header">
                      <span>
                        Participant Name
                      </span>

                      <span>
                        Designation
                      </span>

                      <span>
                        Company
                      </span>

                      <span>
                        Status
                      </span>

                      <span>
                        Absence Reason
                      </span>

                      <span />
                    </div>

                    {attendanceRows.map(
                      (row, index) => (
                        <div
                          className="training-manual-attendance-row"
                          key={index}
                        >
                          <input
                            type="text"
                            value={
                              row.participant_name
                            }
                            onChange={(
                              event
                            ) =>
                              updateAttendanceRow(
                                index,
                                "participant_name",
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="Enter participant name"
                          />

                          <input
                            type="text"
                            value={
                              row.participant_designation
                            }
                            onChange={(
                              event
                            ) =>
                              updateAttendanceRow(
                                index,
                                "participant_designation",
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="Designation"
                          />

                          <input
                            type="text"
                            value={
                              row.participant_company
                            }
                            onChange={(
                              event
                            ) =>
                              updateAttendanceRow(
                                index,
                                "participant_company",
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="Company"
                          />

                          <select
                            value={
                              row.attendance_status
                            }
                            onChange={(
                              event
                            ) =>
                              updateAttendanceRow(
                                index,
                                "attendance_status",
                                event
                                  .target
                                  .value
                              )
                            }
                          >
                            <option value="Present">
                              Present
                            </option>

                            <option value="Absent">
                              Absent
                            </option>
                          </select>

                          <input
                            type="text"
                            value={
                              row.absence_reason
                            }
                            disabled={
                              row.attendance_status !==
                              "Absent"
                            }
                            onChange={(
                              event
                            ) =>
                              updateAttendanceRow(
                                index,
                                "absence_reason",
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder={
                              row.attendance_status ===
                              "Absent"
                                ? "Reason required"
                                : "Not required"
                            }
                          />

                          <button
                            type="button"
                            className="training-remove-row-button"
                            onClick={() =>
                              removeAttendanceRow(
                                index
                              )
                            }
                            disabled={
                              attendanceRows.length ===
                              1
                            }
                            aria-label="Remove participant"
                          >
                            <Trash2
                              size={17}
                            />
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    className="training-add-row-button"
                    onClick={
                      addAttendanceRow
                    }
                  >
                    <Plus size={17} />

                    Add Participant
                  </button>

                  <label className="training-workflow-field">
                    <span>
                      Completion remarks
                    </span>

                    <textarea
                      rows="3"
                      value={
                        completionRemarks
                      }
                      onChange={(event) =>
                        setCompletionRemarks(
                          event.target.value
                        )
                      }
                      placeholder="Optional completion remarks"
                    />
                  </label>
                </>
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
                    setActiveModal(
                      "details"
                    )
                  }
                  disabled={
                    attendanceSaving ||
                    attendanceLoading
                  }
                >
                  Back
                </button>

                <button
                  type="button"
                  className="training-event-done-button"
                  onClick={
                    saveAttendance
                  }
                  disabled={
                    attendanceSaving ||
                    attendanceLoading
                  }
                >
                  {attendanceSaving
                    ? "Saving..."
                    : selectedEvent.status ===
                      "Completed"
                    ? "Update Attendance"
                    : "Save Attendance"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          NOT DONE MODAL
      ===================================================== */}

      {selectedEvent &&
        activeModal === "not-done" && (
          <div
            className="training-event-modal-overlay"
            onMouseDown={
              closeAllModals
            }
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
                    Completion Update
                  </span>

                  <h2>
                    Training Not Conducted
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    closeAllModals
                  }
                >
                  <X size={20} />
                </button>
              </div>

              <div className="training-selected-session warning">
                <AlertTriangle
                  size={20}
                />

                <div>
                  <span>
                    Selected Training
                  </span>

                  <strong>
                    {selectedEvent.title} —{" "}
                    {
                      selectedEvent.siteName
                    }
                  </strong>
                </div>
              </div>

              <label className="training-workflow-field">
                <span>
                  Reason not conducted *
                </span>

                <textarea
                  rows="4"
                  value={
                    notDoneReason
                  }
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
                  checked={
                    shouldReschedule
                  }
                  onChange={(event) => {
                    setShouldReschedule(
                      event.target.checked
                    );

                    if (
                      !event.target.checked
                    ) {
                      setRescheduledDate(
                        ""
                      );
                    }
                  }}
                />

                <span>
                  Reschedule this training
                </span>
              </label>

              {shouldReschedule && (
                <label className="training-workflow-field">
                  <span>
                    New training date *
                  </span>

                  <input
                    type="date"
                    min={
                      selectedEvent.session_date
                    }
                    value={
                      rescheduledDate
                    }
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
                    setActiveModal(
                      "details"
                    )
                  }
                  disabled={
                    notDoneSaving
                  }
                >
                  Back
                </button>

                <button
                  type="button"
                  className="training-event-not-done-button"
                  onClick={
                    saveNotDoneUpdate
                  }
                  disabled={
                    notDoneSaving
                  }
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
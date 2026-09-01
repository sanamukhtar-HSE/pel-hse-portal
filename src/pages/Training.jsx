import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";
import TrainingCalendar from "../components/TrainingCalendar";

import "../styles/Training.css";

function Training() {
  const navigate = useNavigate();
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState("overview");
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (user) {
      loadTrainingSessions();
    }
  }, [user]);

  async function loadTrainingSessions() {
    setLoadingSessions(true);
    setErrorMessage("");

    let query = supabase
      .from("training_sessions")
      .select(`
        id,
        title,
        training_type_id,
        site_id,
        trainer_name,
        session_date,
        start_time,
        end_time,
        venue,
        status,
        frequency,
        session_category,
        remarks,
        sites (
          name
        ),
        training_types (
          name
        )
      `)
      .order("session_date", { ascending: true });

    /*
      Admin sees all sites.

      All other users see only their assigned site.
    */
    if (
      user?.user_type !== "Admin" &&
      user?.site_id
    ) {
      query = query.eq("site_id", user.site_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Training page loading failed:", error);
      setSessions([]);
      setErrorMessage(error.message);
      setLoadingSessions(false);
      return;
    }

    setSessions(data || []);
    setLoadingSessions(false);
  }

  function getSessionStatus(session) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessionDate = new Date(
      `${session.session_date}T00:00:00`
    );

    const savedStatus = session.status || "Scheduled";

    const finishedStatuses = [
      "Completed",
      "Cancelled",
      "Rescheduled",
      "Not Conducted",
    ];

    if (
      sessionDate < today &&
      !finishedStatuses.includes(savedStatus)
    ) {
      return "Overdue";
    }

    if (
      sessionDate.getTime() === today.getTime() &&
      savedStatus === "Scheduled"
    ) {
      return "Due Today";
    }

    return savedStatus;
  }

  const trainingKpis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(
      sevenDaysFromNow.getDate() + 7
    );

    let scheduled = 0;
    let completed = 0;
    let dueThisWeek = 0;
    let overdue = 0;

    sessions.forEach((session) => {
      const sessionDate = new Date(
        `${session.session_date}T00:00:00`
      );

      const displayStatus = getSessionStatus(session);

      if (
        displayStatus === "Scheduled" ||
        displayStatus === "Due Soon" ||
        displayStatus === "Due Today"
      ) {
        scheduled += 1;
      }

      if (displayStatus === "Completed") {
        completed += 1;
      }

      if (
        sessionDate >= today &&
        sessionDate <= sevenDaysFromNow &&
        ![
          "Completed",
          "Cancelled",
          "Rescheduled",
          "Not Conducted",
        ].includes(displayStatus)
      ) {
        dueThisWeek += 1;
      }

      if (displayStatus === "Overdue") {
        overdue += 1;
      }
    });

    return {
      scheduled,
      completed,
      dueThisWeek,
      overdue,
    };
  }, [sessions]);

  const upcomingSessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sessions
      .filter((session) => {
        const sessionDate = new Date(
          `${session.session_date}T00:00:00`
        );

        const displayStatus = getSessionStatus(session);

        return (
          sessionDate >= today &&
          ![
            "Completed",
            "Cancelled",
            "Rescheduled",
            "Not Conducted",
          ].includes(displayStatus)
        );
      })
      .slice(0, 6);
  }, [sessions]);

  const overdueSessions = useMemo(() => {
    return sessions
      .filter(
        (session) =>
          getSessionStatus(session) === "Overdue"
      )
      .sort(
        (first, second) =>
          new Date(first.session_date) -
          new Date(second.session_date)
      )
      .slice(0, 6);
  }, [sessions]);

  const completedSessions = useMemo(() => {
    return sessions
      .filter(
        (session) =>
          getSessionStatus(session) === "Completed"
      )
      .sort(
        (first, second) =>
          new Date(second.session_date) -
          new Date(first.session_date)
      )
      .slice(0, 6);
  }, [sessions]);

  function formatDate(dateValue) {
    if (!dateValue) {
      return "Date not set";
    }

    const date = new Date(`${dateValue}T00:00:00`);

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(timeValue) {
    if (!timeValue) {
      return "Time not set";
    }

    const [hours, minutes] = timeValue.split(":");

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

  function getMonth(dateValue) {
    if (!dateValue) {
      return "";
    }

    const date = new Date(`${dateValue}T00:00:00`);

    return date
      .toLocaleDateString("en-US", {
        month: "short",
      })
      .toUpperCase();
  }

  function getDay(dateValue) {
    if (!dateValue) {
      return "";
    }

    const date = new Date(`${dateValue}T00:00:00`);

    return String(date.getDate()).padStart(2, "0");
  }

  function getSiteName(session) {
    return session.sites?.name || "Site not assigned";
  }

  function getTrainingType(session) {
    return (
      session.training_types?.name ||
      session.title ||
      "Training"
    );
  }

  function getStatusClass(status) {
    if (status === "Completed") {
      return "completed";
    }

    if (
      status === "Overdue" ||
      status === "Not Conducted"
    ) {
      return "overdue";
    }

    if (
      status === "Due Today" ||
      status === "Due Soon"
    ) {
      return "due";
    }

    if (
      status === "Rescheduled" ||
      status === "Postponed"
    ) {
      return "rescheduled";
    }

    if (status === "Cancelled") {
      return "cancelled";
    }

    return "scheduled";
  }

  function renderSessionCards(
  sessionList,
  emptyTitle,
  emptyText,
  sectionType = "standard"
) {
  if (loadingSessions) {
    return (
      <div className="training-empty-state compact">
        <div>⏳</div>
        <h3>Loading training schedule</h3>
        <p>Please wait while the records are loaded.</p>
      </div>
    );
  }

  if (sessionList.length === 0) {
    return (
      <div className="training-empty-state compact">
        <div>{sectionType === "completed" ? "✓" : "📅"}</div>
        <h3>{emptyTitle}</h3>
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div
      className={`training-event-grid ${
        sessionList.length === 1
          ? "single-event"
          : sessionList.length === 2
          ? "two-events"
          : ""
      }`}
    >
      {sessionList.map((session) => {
        const displayStatus = getSessionStatus(session);

        return (
          <article
            className={`training-event-card ${getStatusClass(
              displayStatus
            )}`}
            key={session.id}
          >
            <div className="training-date-block">
              <div className="training-date-month">
                {getMonth(session.session_date)}
              </div>

              <div className="training-date-day">
                {getDay(session.session_date)}
              </div>
            </div>

            <div className="training-event-content">
              <div className="training-event-topline">
                <span
                  className={`training-event-status ${getStatusClass(
                    displayStatus
                  )}`}
                >
                  {displayStatus}
                </span>

                <span className="training-event-category">
                  {session.session_category || "Formal Training"}
                </span>
              </div>

              <h3>{session.title}</h3>

              <p className="training-event-site">
                📍 {getSiteName(session)}
              </p>

              <div className="training-event-information">
                <span>
                  🕒 {formatTime(session.start_time)}
                </span>

                {session.trainer_name && (
                  <span>👤 {session.trainer_name}</span>
                )}
              </div>

              <div className="training-event-footer">
                <span>{formatDate(session.session_date)}</span>

                <button
                  type="button"
                  onClick={() => setActiveTab("calendar")}
                >
                  View Details →
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

  return (
    <div className="training-page">
      <div className="training-container">
        <header className="training-header">
          <div className="training-header-top">
            <button
              type="button"
              className="training-back-button"
              onClick={() => navigate("/")}
            >
              ← Dashboard
            </button>

            {(user?.user_type === "Admin" ||
              user?.user_type === "HSE") && (
              <div className="training-header-actions">
                <button
                  type="button"
                  className="training-secondary-button"
                  onClick={() =>
                    setActiveTab("register")
                  }
                >
                  Training Register
                </button>

                <button
                  type="button"
                  className="training-primary-button"
                  onClick={() =>
                    navigate(
                      "/training/schedule/new"
                    )
                  }
                >
                  + Schedule Training
                </button>
              </div>
            )}
          </div>

          <div className="training-header-copy">
            <span>HSE Capability Development</span>

            <h1>Training Management</h1>

            <p>
              Plan training activities, monitor upcoming
              schedules, track completion and identify
              overdue sessions across PEPL locations.
            </p>
          </div>
        </header>

        <nav className="training-tabs">
          <button
            type="button"
            className={
              activeTab === "overview" ? "active" : ""
            }
            onClick={() =>
              setActiveTab("overview")
            }
          >
            Overview
          </button>

          <button
            type="button"
            className={
              activeTab === "register" ? "active" : ""
            }
            onClick={() =>
              setActiveTab("register")
            }
          >
            Training Register
          </button>

          <button
            type="button"
            className={
              activeTab === "calendar" ? "active" : ""
            }
            onClick={() =>
              setActiveTab("calendar")
            }
          >
            Calendar
          </button>
        </nav>

        {errorMessage && (
          <div className="training-form-message">
            Training data could not be loaded:
            {" "}
            {errorMessage}
          </div>
        )}

        {activeTab === "overview" && (
          <>
            <section className="training-kpi-grid">
              <article className="training-kpi-card">
                <div className="training-kpi-icon">
                  📅
                </div>

                <div>
                  <span>Scheduled Trainings</span>

                  <strong>
                    {loadingSessions
                      ? "..."
                      : trainingKpis.scheduled}
                  </strong>

                  <small>
                    Currently awaiting completion
                  </small>
                </div>
              </article>

              <article className="training-kpi-card completed">
                <div className="training-kpi-icon">
                  ✓
                </div>

                <div>
                  <span>Completed Trainings</span>

                  <strong>
                    {loadingSessions
                      ? "..."
                      : trainingKpis.completed}
                  </strong>

                  <small>
                    Marked as successfully completed
                  </small>
                </div>
              </article>

              <article className="training-kpi-card upcoming">
                <div className="training-kpi-icon">
                  ⏳
                </div>

                <div>
                  <span>Due This Week</span>

                  <strong>
                    {loadingSessions
                      ? "..."
                      : trainingKpis.dueThisWeek}
                  </strong>

                  <small>
                    Scheduled within the next 7 days
                  </small>
                </div>
              </article>

              <article className="training-kpi-card expiring">
                <div className="training-kpi-icon">
                  ⚠
                </div>

                <div>
                  <span>Overdue Trainings</span>

                  <strong>
                    {loadingSessions
                      ? "..."
                      : trainingKpis.overdue}
                  </strong>

                  <small>
                    Past the scheduled date
                  </small>
                </div>
              </article>
            </section>

            <section className="training-section">
              <div className="training-section-heading">
                <div>
                  <span>Upcoming Schedule</span>

                  <h2>Upcoming Training Events</h2>

                  <p>
                    Trainings scheduled from today onward.
                  </p>
                </div>

                <button
                  type="button"
                  className="training-link-button"
                  onClick={() =>
                    setActiveTab("calendar")
                  }
                >
                  Open Calendar →
                </button>
              </div>

              {renderSessionCards(
  upcomingSessions,
  "No upcoming training",
  "No training sessions are currently scheduled.",
  "upcoming"
)}
            </section>

            {overdueSessions.length > 0 && (
              <section className="training-section">
                <div className="training-section-heading">
                  <div>
                    <span>Management Attention</span>

                    <h2>Overdue Trainings</h2>

                    <p>
                      Scheduled sessions requiring an
                      immediate completion update.
                    </p>
                  </div>
                </div>

                {renderSessionCards(
  overdueSessions,
  "No overdue training",
  "All scheduled training activities are currently on track.",
  "overdue"
)}
              </section>
            )}

            <section className="training-section">
              <div className="training-section-heading">
                <div>
                  <span>Latest Completion</span>

                  <h2>Recently Completed</h2>

                  <p>
                    The most recently completed training
                    activities.
                  </p>
                </div>
              </div>

              {renderSessionCards(
  completedSessions,
  "No completed trainings yet",
  "Completed sessions will appear here after they are marked as done.",
  "completed"
)}
            </section>
          </>
        )}

        {activeTab === "calendar" && (
          <TrainingCalendar />
        )}

        {activeTab === "register" && (
          <section className="training-section">
            <div className="training-section-heading">
              <div>
                <span>Training Records</span>

                <h2>Training Register</h2>

                <p>
                  A complete list of training sessions
                  recorded in the portal.
                </p>
              </div>

              <button
                type="button"
                className="training-link-button"
                onClick={loadTrainingSessions}
              >
                Refresh Register
              </button>
            </div>

            {loadingSessions ? (
              <div className="training-empty-state">
                <div>⏳</div>
                <h3>Loading training register</h3>
                <p>
                  Please wait while the records load.
                </p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="training-empty-state">
                <div>📋</div>
                <h3>No training records found</h3>
                <p>
                  Scheduled training events will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="training-record-list">
                {sessions.map((session) => {
                  const displayStatus =
                    getSessionStatus(session);

                  return (
                    <article
                      className="training-record-row"
                      key={session.id}
                    >
                      <div className="training-record-person">
                        <div className="training-record-avatar">
                          {session.title
                            ?.charAt(0)
                            ?.toUpperCase() || "T"}
                        </div>

                        <div>
                          <strong>
                            {session.title}
                          </strong>

                          <span>
                            {getSiteName(session)}
                          </span>
                        </div>
                      </div>

                      <div className="training-record-detail">
                        <span>Training Type</span>

                        <strong>
                          {getTrainingType(session)}
                        </strong>
                      </div>

                      <div className="training-record-detail">
                        <span>Date</span>

                        <strong>
                          {formatDate(
                            session.session_date
                          )}
                        </strong>
                      </div>

                      <div>
                        <span
                          className={`training-record-status ${getStatusClass(
                            displayStatus
                          )}`}
                        >
                          {displayStatus}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default Training;
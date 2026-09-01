import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";

import "../styles/TrainingCalendar.css";

function TrainingCalendar() {
  const { user } = useUser();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTrainingSessions();
    }
  }, [user]);

  async function loadTrainingSessions() {
    setLoading(true);

    let query = supabase
      .from("training_sessions")
      .select(`
        id,
        title,
        session_date,
        start_time,
        status,
        session_category,
        site_id,
        sites (
          name
        )
      `)
      .order("session_date", { ascending: true });

    // Admin sees every site.
    // All other users see only their assigned site.
    if (user?.user_type !== "Admin" && user?.site_id) {
      query = query.eq("site_id", user.site_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Training calendar loading failed:", error);
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

    const sessionDate = new Date(
      `${session.session_date}T00:00:00`
    );

    const finishedStatuses = [
      "Completed",
      "Cancelled",
      "Rescheduled",
      "Not Conducted",
    ];

    if (
      sessionDate < today &&
      !finishedStatuses.includes(session.status)
    ) {
      return "Overdue";
    }

    if (
      sessionDate.getTime() === today.getTime() &&
      session.status === "Scheduled"
    ) {
      return "Due Today";
    }

    return session.status || "Scheduled";
  }

  function getEventColour(status) {
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

  const calendarEvents = useMemo(() => {
    return sessions.map((session) => {
      const displayStatus = getDisplayStatus(session);
      const colours = getEventColour(displayStatus);

      return {
        id: String(session.id),
        title: session.title,
        date: session.session_date,

        backgroundColor: colours.backgroundColor,
        borderColor: colours.borderColor,
        textColor: colours.textColor,

        extendedProps: {
          status: displayStatus,
          siteName:
            session.sites?.name || "Site not assigned",
          startTime: session.start_time,
          category: session.session_category,
        },
      };
    });
  }, [sessions]);

  function handleEventClick(info) {
    const event = info.event;
    const details = event.extendedProps;

    console.log("Selected training:", {
      id: event.id,
      title: event.title,
      date: event.startStr,
      ...details,
    });
  }

  return (
    <section className="training-section">
      <div className="training-section-heading">
        <div>
          <span>Live Schedule</span>
          <h2>Training Calendar</h2>

          <p>
            {user?.user_type === "Admin"
              ? "Training activities across all PEPL locations."
              : "Training activities scheduled for your site."}
          </p>
        </div>
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

        {loading ? (
          <div className="training-calendar-loading">
            Loading training schedule...
          </div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            firstDay={1}
            height="auto"
            fixedWeekCount={false}
            dayMaxEvents={2}
            events={calendarEvents}
            eventClick={handleEventClick}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
          />
        )}
      </div>
    </section>
  );
}

export default TrainingCalendar;
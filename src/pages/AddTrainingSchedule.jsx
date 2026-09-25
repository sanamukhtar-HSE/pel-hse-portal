import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";
import "../styles/AddTrainingSchedule.css";

const initialForm = {
  training_type_id: "",
  title: "",
  session_category: "Formal Training",
  site_id: "",
  session_date: "",
  start_time: "",
  end_time: "",
  trainer_name: "",
  venue: "",
  frequency: "One Time",
  repeat_until: "",
  responsible_user_id: "",
  reminder_days: ["7", "3", "1"],
  remarks: "",
};

function AddTrainingSchedule() {
  const navigate = useNavigate();
  const { user } = useUser();

  const [form, setForm] = useState(initialForm);
  const [trainingTypes, setTrainingTypes] = useState([]);
  const [sites, setSites] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isAdmin = user?.user_type === "Admin";
  const isHSE = user?.user_type === "HSE";
  const isPlantIncharge =
    user?.user_type === "Plant Incharge";

  const isAssignedSiteUser =
    isHSE || isPlantIncharge;

  useEffect(() => {
    if (user) {
      loadFormData();
    }
  }, [user]);

  async function loadFormData() {
    setLoadingData(true);
    setMessage("");

    const [
      { data: typeData, error: typeError },
      { data: siteData, error: siteError },
      { data: employeeData, error: employeeError },
    ] = await Promise.all([
      supabase
        .from("training_types")
        .select(
          "id, name, validity_months, mandatory"
        )
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("sites")
        .select("id, name")
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("employees")
        .select("*")
        .order("full_name", {
          ascending: true,
        }),
    ]);

    if (
      typeError ||
      siteError ||
      employeeError
    ) {
      console.error(
        "Training form data loading failed:",
        {
          typeError,
          siteError,
          employeeError,
        }
      );

      setMessage(
        typeError?.message ||
          siteError?.message ||
          employeeError?.message ||
          "Could not load form data."
      );
    }

    setTrainingTypes(typeData || []);
    setSites(siteData || []);
    setEmployees(employeeData || []);

    /*
      HSE and Plant Incharge:
      automatically use their assigned site.

      Admin:
      can choose any site.
    */
    if (
      isAssignedSiteUser &&
      user?.site_id
    ) {
      setForm((current) => ({
        ...current,
        site_id: String(user.site_id),
      }));
    }

    setLoadingData(false);
  }

  const selectedSiteName = useMemo(() => {
    if (!form.site_id) {
      return "";
    }

    return (
      sites.find(
        (site) =>
          String(site.id) ===
          String(form.site_id)
      )?.name || ""
    );
  }, [sites, form.site_id]);

  const responsibleEmployees = useMemo(() => {
    if (!form.site_id) {
      return [];
    }

    return employees.filter(
      (employee) =>
        String(employee.site_id || "") ===
        String(form.site_id)
    );
  }, [employees, form.site_id]);

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSiteChange(value) {
    // Non-admin users cannot change site.
    if (!isAdmin) {
      return;
    }

    setForm((current) => ({
      ...current,
      site_id: value,
      responsible_user_id: "",
    }));
  }

  function handleTrainingTypeChange(value) {
    const selectedType =
      trainingTypes.find(
        (type) =>
          String(type.id) ===
          String(value)
      );

    setForm((current) => ({
      ...current,
      training_type_id: value,
      title:
        selectedType?.name ||
        current.title,
    }));
  }

  function handleReminderChange(value) {
    setForm((current) => {
      const alreadySelected =
        current.reminder_days.includes(
          value
        );

      return {
        ...current,
        reminder_days: alreadySelected
          ? current.reminder_days.filter(
              (day) => day !== value
            )
          : [
              ...current.reminder_days,
              value,
            ],
      };
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

  function getEmployeeEmail(employee) {
    return (
      employee.email ||
      employee.work_email ||
      ""
    );
  }

  function createOccurrenceDates(
    startDate,
    frequency,
    repeatUntil
  ) {
    const dates = [];

    if (!startDate) {
      return dates;
    }

    const current = new Date(
      `${startDate}T12:00:00`
    );

    if (frequency === "One Time") {
      return [startDate];
    }

    if (!repeatUntil) {
      return [startDate];
    }

    const finalDate = new Date(
      `${repeatUntil}T12:00:00`
    );

    while (current <= finalDate) {
      dates.push(
        current
          .toISOString()
          .slice(0, 10)
      );

      if (frequency === "Daily") {
        current.setDate(
          current.getDate() + 1
        );
      }

      if (frequency === "Weekly") {
        current.setDate(
          current.getDate() + 7
        );
      }

      if (frequency === "Monthly") {
        const originalDay =
          current.getDate();

        current.setMonth(
          current.getMonth() + 1
        );

        if (
          current.getDate() !==
          originalDay
        ) {
          current.setDate(0);
        }
      }
    }

    return dates;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    /*
      Final frontend protection:
      HSE / Plant Incharge must have
      an assigned site.
    */
    if (
      isAssignedSiteUser &&
      !user?.site_id
    ) {
      setMessage(
        "Your employee record does not have an assigned site. Please contact Admin."
      );
      return;
    }

    /*
      Make absolutely sure the submitted site
      matches the user's assigned site.
    */
    if (
      isAssignedSiteUser &&
      String(form.site_id) !==
        String(user.site_id)
    ) {
      setMessage(
        "You can only schedule training for your assigned site."
      );
      return;
    }

    if (
      !form.training_type_id ||
      !form.title.trim() ||
      !form.site_id ||
      !form.session_date
    ) {
      setMessage(
        "Please select the training type, site and scheduled date."
      );
      return;
    }

    if (
      form.frequency !== "One Time" &&
      !form.repeat_until
    ) {
      setMessage(
        "Please select the date until which this schedule should repeat."
      );
      return;
    }

    if (
      form.repeat_until &&
      form.repeat_until <
        form.session_date
    ) {
      setMessage(
        "The repeat-until date cannot be earlier than the first training date."
      );
      return;
    }

    const selectedResponsible =
      employees.find(
        (employee) =>
          String(employee.id) ===
          String(
            form.responsible_user_id
          )
      );

    /*
      Make sure responsible person belongs
      to the selected site.
    */
    if (
      selectedResponsible &&
      String(
        selectedResponsible.site_id || ""
      ) !== String(form.site_id)
    ) {
      setMessage(
        "The responsible person must belong to the selected site."
      );
      return;
    }

    const occurrenceDates =
      createOccurrenceDates(
        form.session_date,
        form.frequency,
        form.repeat_until
      );

    if (occurrenceDates.length === 0) {
      setMessage(
        "No valid schedule dates were generated."
      );
      return;
    }

    if (occurrenceDates.length > 366) {
      setMessage(
        "This schedule creates too many events. Please shorten the repeat period."
      );
      return;
    }

    const reminderDays =
      form.reminder_days
        .map(Number)
        .filter(
          (day) =>
            Number.isInteger(day) &&
            day >= 0
        )
        .sort((a, b) => b - a);

    const sessionsToInsert =
      occurrenceDates.map((date) => ({
        training_type_id:
          Number(form.training_type_id),

        site_id:
          Number(form.site_id),

        title:
          form.title.trim(),

        trainer_name:
          form.trainer_name.trim() ||
          null,

        session_date: date,

        start_time:
          form.start_time || null,

        end_time:
          form.end_time || null,

        venue:
          form.venue.trim() || null,

        status: "Scheduled",

        remarks:
          form.remarks.trim() || null,

        frequency:
          form.frequency,

        repeat_until:
          form.frequency ===
          "One Time"
            ? null
            : form.repeat_until,

        reminder_days:
          reminderDays,

        responsible_user_id:
          form.responsible_user_id
            ? Number(
                form.responsible_user_id
              )
            : null,

        responsible_email:
          selectedResponsible
            ? getEmployeeEmail(
                selectedResponsible
              ) || null
            : null,

        session_category:
          form.session_category,
      }));

    setSaving(true);

    const { data, error } =
      await supabase
        .from("training_sessions")
        .insert(
          sessionsToInsert
        )
        .select(
          "id, title, session_date"
        );

    setSaving(false);

    if (error) {
      console.error(
        "Training schedule save failed:",
        error
      );

      setMessage(error.message);
      return;
    }

    setMessage(
      `${
        data?.length ||
        sessionsToInsert.length
      } training event${
        sessionsToInsert.length ===
        1
          ? ""
          : "s"
      } scheduled successfully.`
    );

    /*
      Reset the form, but preserve the
      assigned site for HSE / Plant Incharge.
    */
    setForm({
      ...initialForm,
      site_id:
        isAssignedSiteUser &&
        user?.site_id
          ? String(user.site_id)
          : "",
    });

    window.setTimeout(() => {
      navigate("/training");
    }, 1200);
  }

  return (
    <div className="training-form-page">
      <div className="training-form-container">

        <header className="training-form-header">
          <button
            type="button"
            className="training-form-back"
            onClick={() =>
              navigate("/training")
            }
          >
            ← Training
          </button>

          <div>
            <span>
              Training Planning
            </span>

            <h1>
              Add Training Schedule
            </h1>

            <p>
              Create a one-time or recurring
              training schedule for a specific
              site.
            </p>
          </div>
        </header>

        {message && (
          <div className="training-form-message">
            {message}
          </div>
        )}

        {loadingData ? (
          <div className="training-form-loading">
            Loading training information...
          </div>
        ) : (
          <form
            className="training-schedule-form"
            onSubmit={handleSubmit}
          >

            <section className="training-form-card">

              <div className="training-form-card-heading">
                <div className="training-form-card-icon">
                  🎓
                </div>

                <div>
                  <h2>
                    Training Details
                  </h2>

                  <p>
                    Select the training activity
                    and responsible site.
                  </p>
                </div>
              </div>

              <div className="training-form-grid">

                <label className="training-form-field">
                  <span>
                    Training Type *
                  </span>

                  <select
                    value={
                      form.training_type_id
                    }
                    onChange={(event) =>
                      handleTrainingTypeChange(
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Select training type
                    </option>

                    {trainingTypes.map(
                      (type) => (
                        <option
                          value={type.id}
                          key={type.id}
                        >
                          {type.name}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="training-form-field">
                  <span>
                    Category *
                  </span>

                  <select
                    value={
                      form.session_category
                    }
                    onChange={(event) =>
                      updateField(
                        "session_category",
                        event.target.value
                      )
                    }
                  >
                    <option value="Formal Training">
                      Formal Training
                    </option>

                    <option value="Toolbox Talk">
                      Toolbox Talk / Safety Talk
                    </option>
                  </select>
                </label>

                <label className="training-form-field">
                  <span>
                    Site *
                  </span>

                  {isAdmin ? (
                    <select
                      value={form.site_id}
                      onChange={(event) =>
                        handleSiteChange(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Select site
                      </option>

                      {sites.map(
                        (site) => (
                          <option
                            value={site.id}
                            key={site.id}
                          >
                            {site.name}
                          </option>
                        )
                      )}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={
                        selectedSiteName ||
                        "Assigned site not available"
                      }
                      readOnly
                      disabled
                    />
                  )}
                </label>

                <label className="training-form-field">
                  <span>
                    Training Title *
                  </span>

                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      updateField(
                        "title",
                        event.target.value
                      )
                    }
                    placeholder="Example: Fire Fighting Refresher"
                  />
                </label>

                <label className="training-form-field">
                  <span>
                    Trainer
                  </span>

                  <input
                    type="text"
                    value={
                      form.trainer_name
                    }
                    onChange={(event) =>
                      updateField(
                        "trainer_name",
                        event.target.value
                      )
                    }
                    placeholder="Trainer or facilitator name"
                  />
                </label>

                <label className="training-form-field">
                  <span>
                    Venue
                  </span>

                  <input
                    type="text"
                    value={form.venue}
                    onChange={(event) =>
                      updateField(
                        "venue",
                        event.target.value
                      )
                    }
                    placeholder="Training room or location"
                  />
                </label>

              </div>
            </section>

            <section className="training-form-card">

              <div className="training-form-card-heading">
                <div className="training-form-card-icon">
                  📅
                </div>

                <div>
                  <h2>
                    Schedule and Frequency
                  </h2>

                  <p>
                    Choose when the training starts
                    and how often it repeats.
                  </p>
                </div>
              </div>

              <div className="training-form-grid">

                <label className="training-form-field">
                  <span>
                    First Training Date *
                  </span>

                  <input
                    type="date"
                    value={
                      form.session_date
                    }
                    onChange={(event) =>
                      updateField(
                        "session_date",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="training-form-field">
                  <span>
                    Frequency *
                  </span>

                  <select
                    value={form.frequency}
                    onChange={(event) =>
                      updateField(
                        "frequency",
                        event.target.value
                      )
                    }
                  >
                    <option value="One Time">
                      One Time
                    </option>

                    <option value="Daily">
                      Daily
                    </option>

                    <option value="Weekly">
                      Weekly
                    </option>

                    <option value="Monthly">
                      Monthly
                    </option>
                  </select>
                </label>

                {form.frequency !==
                  "One Time" && (
                  <label className="training-form-field">
                    <span>
                      Repeat Until *
                    </span>

                    <input
                      type="date"
                      min={
                        form.session_date ||
                        undefined
                      }
                      value={
                        form.repeat_until
                      }
                      onChange={(event) =>
                        updateField(
                          "repeat_until",
                          event.target.value
                        )
                      }
                    />
                  </label>
                )}

                <label className="training-form-field">
                  <span>
                    Start Time
                  </span>

                  <input
                    type="time"
                    value={
                      form.start_time
                    }
                    onChange={(event) =>
                      updateField(
                        "start_time",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="training-form-field">
                  <span>
                    End Time
                  </span>

                  <input
                    type="time"
                    value={
                      form.end_time
                    }
                    onChange={(event) =>
                      updateField(
                        "end_time",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="training-form-field">
                  <span>
                    Responsible Person
                  </span>

                  <select
                    value={
                      form.responsible_user_id
                    }
                    onChange={(event) =>
                      updateField(
                        "responsible_user_id",
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Select responsible person
                    </option>

                    {responsibleEmployees.map(
                      (employee) => (
                        <option
                          value={employee.id}
                          key={employee.id}
                        >
                          {getEmployeeName(
                            employee
                          )}
                        </option>
                      )
                    )}
                  </select>
                </label>

              </div>
            </section>

            <section className="training-form-card">

              <div className="training-form-card-heading">
                <div className="training-form-card-icon">
                  🔔
                </div>

                <div>
                  <h2>
                    Reminder Settings
                  </h2>

                  <p>
                    Select when the responsible
                    person should be reminded.
                  </p>
                </div>
              </div>

              <div className="training-reminder-options">
                {[
                  ["7", "7 days before"],
                  ["3", "3 days before"],
                  ["1", "1 day before"],
                  ["0", "On the due date"],
                ].map(
                  ([value, label]) => (
                    <label
                      className="training-reminder-option"
                      key={value}
                    >
                      <input
                        type="checkbox"
                        checked={form.reminder_days.includes(
                          value
                        )}
                        onChange={() =>
                          handleReminderChange(
                            value
                          )
                        }
                      />

                      <span>
                        {label}
                      </span>
                    </label>
                  )
                )}
              </div>

              <label className="training-form-field full-width">
                <span>
                  Remarks
                </span>

                <textarea
                  rows="4"
                  value={form.remarks}
                  onChange={(event) =>
                    updateField(
                      "remarks",
                      event.target.value
                    )
                  }
                  placeholder="Additional instructions or information"
                />
              </label>

            </section>

            <div className="training-form-actions">

              <button
                type="button"
                className="training-form-cancel"
                onClick={() =>
                  navigate("/training")
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="training-form-submit"
                disabled={saving}
              >
                {saving
                  ? "Creating Schedule..."
                  : "Create Training Schedule"}
              </button>

            </div>

          </form>
        )}
      </div>
    </div>
  );
}

export default AddTrainingSchedule;
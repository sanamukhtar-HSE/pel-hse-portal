import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../styles/IncidentForm.css";
import { useUser } from "../context/UserContext";

function EditIncident() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, loading: userLoading } = useUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [incidentType, setIncidentType] = useState("");
  const [ptwRequired, setPtwRequired] = useState("");
  const [photo, setPhoto] = useState(null);
  const [incidentDate, setIncidentDate] = useState("");
  const [incidentTime, setIncidentTime] = useState("");
  const [severity, setSeverity] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [operationArea, setOperationArea] = useState("");
  const [underSupervision, setUnderSupervision] = useState("");
  const [permitNumber, setPermitNumber] = useState("");
  const [activity, setActivity] = useState("");
  const [remarks, setRemarks] = useState("");

  const [people, setPeople] = useState([]);

  useEffect(() => {
    if (!userLoading && user) {
      loadIncident();
    }
  }, [userLoading, user, id]);

  async function loadIncident() {
    setLoading(true);

    const { data: incident, error } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      alert("Unable to load the incident.");
      navigate("/");
      return;
    }

    // Security check in the frontend.
    // Database RLS is the actual security control.
    if (
      incident.created_by !== user.auth_user_id ||
      incident.approval_status !== "Pending"
    ) {
      alert("This incident can no longer be edited.");
      navigate("/incident/" + id);
      return;
    }

    setIncidentType(incident.incident_type || "");
    setPtwRequired(incident.ptw_required || "");
    setIncidentDate(incident.incident_date || "");
    setIncidentTime(incident.incident_time || "");
    setSeverity(incident.severity || "");
    setLocation(incident.exact_location || "");
    setDescription(incident.description || "");
    setOperationArea(incident.operation_area || "");
    setUnderSupervision(incident.under_supervision || "");
    setPermitNumber(incident.permit_number || "");
    setActivity(incident.activity || "");
    setRemarks(incident.remarks || "");

    const { data: peopleData, error: peopleError } = await supabase
      .from("incident_people")
      .select("*")
      .eq("incident_id", id)
      .order("id", { ascending: true });

    if (peopleError) {
      console.error(peopleError);
    }

    setPeople(
      peopleData && peopleData.length > 0
        ? peopleData.map((person) => ({
            id: person.id,
            name: person.name || "",
            company: person.company || "",
            designation: person.designation || "",
            role: person.role || "",
          }))
        : [
            {
              name: "",
              company: "",
              designation: "",
              role: "",
            },
          ]
    );

    setLoading(false);
  }

  const addPerson = () => {
    setPeople([
      ...people,
      {
        name: "",
        company: "",
        designation: "",
        role: "",
      },
    ]);
  };

  const updatePerson = (index, field, value) => {
    const updated = [...people];
    updated[index][field] = value;
    setPeople(updated);
  };

  const handleSave = async () => {
    if (
      !incidentDate ||
      !incidentTime ||
      !location ||
      !incidentType ||
      !description
    ) {
      alert("Please complete all required fields before saving.");
      return;
    }

    if (incidentType === "Near Miss" && !severity) {
      alert("Please select the Potential Severity.");
      return;
    }

    setSaving(true);

    let photoUrl = null;

    // Upload a new photo only if the employee selected one.
    if (photo) {
      const fileExtension = photo.name.split(".").pop();
      const fileName =
        Date.now() + "-" + crypto.randomUUID() + "." + fileExtension;

      const { error: uploadError } = await supabase.storage
        .from("incident-photos")
        .upload(fileName, photo);

      if (uploadError) {
        console.error(uploadError);
        alert("Photo upload failed.");
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("incident-photos")
        .getPublicUrl(fileName);

      photoUrl = urlData.publicUrl;
    }

    const updateData = {
      incident_date: incidentDate,
      incident_time: incidentTime,
      incident_type: incidentType,
      severity: severity,
      exact_location: location,
      operation_area: operationArea,
      under_supervision: underSupervision,
      ptw_required: ptwRequired,
      permit_number: permitNumber,
      activity: activity,
      description: description,
      remarks: remarks,
    };

    if (photoUrl) {
      updateData.photo_url = photoUrl;
    }

    const { error: updateError } = await supabase
      .from("incidents")
      .update(updateData)
      .eq("id", id)
      .eq("created_by", user.auth_user_id)
      .eq("approval_status", "Pending");

    if (updateError) {
      console.error(updateError);
      alert(updateError.message);
      setSaving(false);
      return;
    }

    // Update existing people.
    for (const person of people) {
      if (!person.id) {
        const { error } = await supabase
          .from("incident_people")
          .insert({
            incident_id: Number(id),
            name: person.name,
            company: person.company,
            designation: person.designation,
            role: person.role,
            injured: person.role === "Injured" ? "Yes" : "No",
          });

        if (error) {
          console.error(error);
        }
      } else {
        const { error } = await supabase
          .from("incident_people")
          .update({
            name: person.name,
            company: person.company,
            designation: person.designation,
            role: person.role,
            injured: person.role === "Injured" ? "Yes" : "No",
          })
          .eq("id", person.id)
          .eq("incident_id", Number(id));

        if (error) {
          console.error(error);
        }
      }
    }

    alert("Incident updated successfully.");

    navigate("/incident/" + id);
  };

  if (userLoading || loading) {
    return <p>Loading incident...</p>;
  }

  if (!user) {
    return <p>Employee record not found.</p>;
  }

  return (
    <div className="incident-container">
      <div className="incident-header">
        <button
          className="back-button"
          onClick={() => navigate("/incident/" + id)}
        >
          ← Back to Incident
        </button>

        <h1>Edit Incident</h1>

        <p>PEL HSE Incident Reporting System</p>
      </div>

      <div className="section-card">
        <h2>👤 Reporter Information</h2>

        <div className="grid-2">
          <div className="field">
            <label>Employee Name</label>
            <input type="text" value={user.full_name} readOnly />
          </div>

          <div className="field">
            <label>Employee Number</label>
            <input type="text" value={user.employee_no} readOnly />
          </div>

          <div className="field">
            <label>Designation</label>
            <input type="text" value={user.designation} readOnly />
          </div>

          <div className="field">
            <label>Department</label>
            <input type="text" value={user.department} readOnly />
          </div>

          <div className="field full-width">
            <label>Assigned Site</label>
            <input type="text" value={user.site_name} readOnly />
          </div>
        </div>
      </div>

      <div className="section-card">
        <h2>📍 Incident Information</h2>

        <div className="grid-2">
          <div className="field">
            <label>Incident Date</label>
            <input
              type="date"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Incident Time</label>
            <input
              type="time"
              value={incidentTime}
              onChange={(e) => setIncidentTime(e.target.value)}
            />
          </div>

          <div className="field full-width">
            <label>Exact Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Operation / Area</label>

            <select
              value={operationArea}
              onChange={(e) => setOperationArea(e.target.value)}
            >
              <option value="">Select</option>
              <option>Process</option>
              <option>Drilling</option>
              <option>Workover</option>
              <option>Maintenance</option>
              <option>Construction</option>
              <option>Utilities</option>
              <option>Warehouse</option>
              <option>Office</option>
              <option>Camp</option>
              <option>Transportation</option>
              <option>Other</option>
            </select>
          </div>

          <div className="field">
            <label>Incident Type</label>

            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
            >
              <option value="">Select</option>
              <option>Near Miss</option>
              <option>Injury</option>
              <option>Property Damage</option>
              <option>Environmental</option>
              <option>Fire</option>
              <option>Road Accident</option>
            </select>
          </div>

          <div className="field">
            <label>Was work under supervision?</label>

            <select
              value={underSupervision}
              onChange={(e) => setUnderSupervision(e.target.value)}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
              <option>Not Applicable</option>
            </select>
          </div>

          <div className="field">
            <label>Permit to Work Required?</label>

            <select
              value={ptwRequired}
              onChange={(e) => setPtwRequired(e.target.value)}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
              <option>Not Applicable</option>
            </select>
          </div>

          {ptwRequired === "Yes" && (
            <div className="field full-width">
              <label>Permit Number</label>

              <input
                type="text"
                value={permitNumber}
                onChange={(e) => setPermitNumber(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="section-card">
        <h2>📝 Incident Description</h2>

        <div className="field">
          <label>Incident Description</label>

          <textarea
            rows="5"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
          />

          <small className="helper-text">
            Maximum 300 characters.
          </small>
        </div>

        <div className="field">
          <label>Activity Being Performed</label>

          <input
            type="text"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Additional Remarks (Optional)</label>

          <textarea
            rows="4"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>
      </div>

      <div className="section-card">
        <h2>⚠ Incident Specific Details</h2>

        <div className="grid-2">
          <div className="field">
            <label>Severity</label>

            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="">Select</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Catastrophic">Catastrophic</option>
            </select>
          </div>
        </div>

        {incidentType === "Near Miss" && (
          <div className="grid-2">
            <div className="field">
              <label>Potential Consequence</label>

              <select>
                <option>Minor Injury</option>
                <option>Major Injury</option>
                <option>Fatality</option>
                <option>Property Damage</option>
                <option>Environmental Damage</option>
              </select>
            </div>

            <div className="field">
              <label>Unsafe Cause</label>

              <select>
                <option>Unsafe Act</option>
                <option>Unsafe Condition</option>
                <option>Both</option>
                <option>Unknown</option>
              </select>
            </div>
          </div>
        )}

        {incidentType === "Injury" && (
          <div className="grid-2">
            <div className="field">
              <label>Nature of Injury</label>
              <input type="text" />
            </div>

            <div className="field">
              <label>Body Part Affected</label>
              <input type="text" />
            </div>

            <div className="field">
              <label>Medical Treatment Required?</label>
              <select>
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>

            <div className="field">
              <label>Hospitalized?</label>
              <select>
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
          </div>
        )}

        {incidentType === "Property Damage" && (
          <div className="grid-2">
            <div className="field">
              <label>Asset Damaged</label>
              <input type="text" />
            </div>

            <div className="field">
              <label>Equipment Number</label>
              <input type="text" />
            </div>

            <div className="field full-width">
              <label>Estimated Damage Cost</label>
              <input type="number" />
            </div>
          </div>
        )}
      </div>

      <div className="section-card">
        <h2>👥 People Involved</h2>

        {people.map((person, index) => (
          <div className="grid-2" key={person.id || index}>
            <div className="field">
              <label>Name</label>

              <input
                value={person.name}
                onChange={(e) =>
                  updatePerson(index, "name", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label>Company</label>

              <input
                value={person.company}
                onChange={(e) =>
                  updatePerson(index, "company", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label>Designation</label>

              <input
                value={person.designation}
                onChange={(e) =>
                  updatePerson(index, "designation", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label>Role in Incident</label>

              <select
                value={person.role}
                onChange={(e) =>
                  updatePerson(index, "role", e.target.value)
                }
              >
                <option value="">Select</option>
                <option>Injured</option>
                <option>Witness</option>
              </select>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="add-person-btn"
          onClick={addPerson}
        >
          + Add Person
        </button>
      </div>

      <div className="section-card">
        <h2>📷 Incident Photo</h2>

        <p>Optional (JPG / PNG, maximum 5 MB)</p>

        <input
          type="file"
          accept=".jpg,.jpeg,.png"
          onChange={(e) => setPhoto(e.target.files[0])}
        />
      </div>

      <div className="section-card">
        <h2>Status</h2>

        <p>Pending Approval — You can edit this incident until it is reviewed.</p>

        <button
          className="submit-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

export default EditIncident;
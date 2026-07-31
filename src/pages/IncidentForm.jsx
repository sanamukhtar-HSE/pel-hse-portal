import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import "../styles/IncidentForm.css";
import { useUser } from "../context/UserContext";

function IncidentForm() { const navigate = useNavigate(); 

  const [incidentType, setIncidentType] = useState("");
  const [ptwRequired, setPtwRequired] = useState("");
  const [photo, setPhoto] = useState(null);
  const [incidentDate, setIncidentDate] = useState("");
const [incidentTime, setIncidentTime] = useState("");
const [severity, setSeverity] = useState("");
const [location, setLocation] = useState("");
const [description, setDescription] = useState("");
const { user, loading } = useUser();
const [operationArea, setOperationArea] = useState("");
const [underSupervision, setUnderSupervision] = useState("");
const [permitNumber, setPermitNumber] = useState("");
const [activity, setActivity] = useState("");
const [remarks, setRemarks] = useState("");
  const [people, setPeople] = useState([
  {
    name: "",
    company: "",
    designation: "",
    role: "",
  },
]);

  const addPerson = () => {
    setPeople([
      ...people,
      {
        
  name: "",
  company: "",
  designation: "",
  role: "",
}
      
    ]);
  };

  const updatePerson = (index, field, value) => {
    const updated = [...people];
    updated[index][field] = value;
    setPeople(updated);
  };
const handleSubmit = async () => {
  if (
    !incidentDate ||
    !incidentTime ||
    !location ||
    !incidentType ||
    !description
  ) {
    alert("Please complete all required fields before submitting.");
    return;
  }

  if (incidentType === "Near Miss" && !severity) {
  alert("Please select the Potential Severity.");
  return;
}

  let photoUrl = null;

  // Upload photo if selected
  if (photo) {
    const fileExtension = photo.name.split(".").pop();
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("incident-photos")
      .upload(fileName, photo);

    if (uploadError) {
      console.error(uploadError);
      alert("Photo upload failed");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("incident-photos")
      .getPublicUrl(fileName);

    photoUrl = urlData.publicUrl;
  }

  //// Step 1: Save incident first

console.log({
  operationArea,
  underSupervision,
  ptwRequired,
  permitNumber,
  activity,
  remarks,
});



const { data, error } = await supabase
  .from("incidents")
  .insert([
  {
    

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

    photo_url: photoUrl,

   reporter_name: user.full_name,
reporter_designation: user.designation,
report_status: "Pending Approval",
site_id: user.site_id,
  },
])
    .select()
    .single();

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  // Step 2: Generate professional incident number
  const incidentId = data.id;

  const incidentNumber =
    `PEL-${new Date().getFullYear()}-${String(incidentId).padStart(4, "0")}`;

  // Step 3: Save incident number
  const { error: numberError } = await supabase
    .from("incidents")
    .update({
      incident_no: incidentNumber,
    })
    .eq("id", incidentId);

  if (numberError) {
    console.error(numberError);
    alert(numberError.message);
    return;
  }

  // Step 4: Save people involved
  const peopleToInsert = people.map((person) => ({
    incident_id: incidentId,
    name: person.name,
    company: person.company,
    designation: person.designation,
    role: person.role,
    injured: person.role === "Injured" ? "Yes" : "No",
  }));

  const { error: peopleError } = await supabase
    .from("incident_people")
    .insert(peopleToInsert);

  if (peopleError) {
    console.error(peopleError);
    alert(peopleError.message);
    return;
  }

  // Reset form
  setIncidentDate("");
  setIncidentTime("");
  setIncidentType("");
  setSeverity("");
  setLocation("");
  setDescription("");
  setPtwRequired("");
  setPhoto(null);

  setPeople([
    {
      name: "",
      company: "",
      designation: "",
      role: "Witness",
    },
  ]);

  alert(`Incident saved successfully!\nIncident No: ${incidentNumber}`);
};

if (loading) {
  return <p>Loading employee information...</p>;
}

if (!user) {
  return <p>Employee record not found.</p>;
} 

  return (
    <div className="incident-container">

      <div className="incident-header">

        <button
  className="back-button"
  onClick={() => navigate("/")}
>
  ← Dashboard
</button>

        <h1>Report Incident</h1>


        <p>PEL HSE Incident Reporting System</p>

      </div>

      {/* ============================
            Reporter Information
      ============================= */}

      <div className="section-card">

        <h2>👤 Reporter Information</h2>

        <div className="grid-2">

          <div className="field">
            <label>Employee Name</label>
            <input
              type="text"
              value={user.full_name}
              readOnly
            />
          </div>

          <div className="field">
            <label>Employee Number</label>
            <input
              type="text"
              value={user.employee_no}
              readOnly
            />
          </div>

          <div className="field">
            <label>Designation</label>
            <input
              type="text"
              value={user.designation}
              readOnly
            />
          </div>

          <div className="field">
            <label>Department</label>
            <input
              type="text"
              value={user.department}
              readOnly
            />
          </div>

          <div className="field full-width">
            <label>Assigned Site</label>
            <input
              type="text"
              value={user.site_name}
              readOnly
            />
          </div>

        </div>

      </div>

      {/* ============================
          Incident Information
      ============================= */}

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
  placeholder="Example: Compressor Room 2"
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
  placeholder="Enter PTW Number"
/>
            </div>

          )}

        </div>

      </div>
            {/* ============================
          Incident Description
      ============================= */}

      <div className="section-card">

        <h2>📝 Incident Description</h2>

        <div className="field">

  <label>Incident Description</label>

  <textarea
  rows="5"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  maxLength={300}
  placeholder="Briefly describe what happened (maximum 300 characters)"
></textarea>

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
  placeholder="Example: Lifting pipe using crane"
/>

        </div>

        <div className="field">

          <label>Additional Remarks (Optional)</label>

          <textarea
  rows="4"
  value={remarks}
  onChange={(e) => setRemarks(e.target.value)}
  placeholder="Any additional information..."
></textarea>

        </div>

      </div>

      {/* ============================
          Incident Specific Details
      ============================= */}

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

      {/* ============================
          People Involved
      ============================= */}

      <div className="section-card">

        <h2>👥 People Involved</h2>

        {people.map((person, index) => (

          <div className="grid-2" key={index}>

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

      {/* ============================
          Attachment
      ============================= */}

      <div className="section-card">

        <h2>📷 Incident Photo</h2>

        <p>Optional (JPG / PNG, maximum 5 MB)</p>

        <input
  type="file"
  accept=".jpg,.jpeg,.png"
  onChange={(e) => {
    setPhoto(e.target.files[0]);
    console.log(e.target.files[0]);
  }}
/>

      </div>

      {/* ============================
          Submit
      ============================= */}

      <div className="section-card">

        <h2>Status</h2>

        <p>Pending Supervisor Review</p>

        <button
  className="submit-btn"
  onClick={handleSubmit}
>
  Submit Incident
</button>

      </div>

    </div>
  );
}

export default IncidentForm;
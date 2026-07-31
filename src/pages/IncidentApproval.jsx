import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../styles/IncidentDetails.css";

function IncidentApproval() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [incident, setIncident] = useState(null);
  const [decision, setDecision] = useState("");
  const [comments, setComments] = useState("");

  useEffect(() => {
    loadIncident();
  }, []);

  async function loadIncident() {
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setIncident(data);
  }

  async function saveDecision() {
    if (!decision) {
      alert("Please select Approve or Reject.");
      return;
    }

    const { error } = await supabase
      .from("incidents")
      .update({
        report_status: decision,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Decision saved successfully.");

    navigate(`/incident/${id}`);
  }

  if (!incident) return <h2>Loading...</h2>;

  return (
    <div className="container">

      <div className="header">

        <button
          className="back-button"
          onClick={() => navigate(`/incident/${id}`)}
        >
          ← Incident Details
        </button>

        <h1>Supervisor Approval</h1>

        <p>{incident.incident_no}</p>

      </div>

      <div className="card">

        <h2>Current Status</h2>

        <p>{incident.report_status}</p>

        <br />

        <h2>Supervisor Comments</h2>

        <textarea
          rows="5"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Enter approval comments..."
          style={{ width: "100%" }}
        />

        <br />
        <br />

        <h2>Decision</h2>

        <label>
          <input
            type="radio"
            value="Approved"
            checked={decision === "Approved"}
            onChange={(e) => setDecision(e.target.value)}
          />

          {" "}Approve
        </label>

        <br />

        <label>
          <input
            type="radio"
            value="Rejected"
            checked={decision === "Rejected"}
            onChange={(e) => setDecision(e.target.value)}
          />

          {" "}Reject
        </label>

        <br />
        <br />

        <button
          className="print-button"
          onClick={saveDecision}
        >
          Save Decision
        </button>

      </div>

    </div>
  );
}

export default IncidentApproval;
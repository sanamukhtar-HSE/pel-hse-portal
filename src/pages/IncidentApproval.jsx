import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../styles/IncidentDetails.css";
import { useUser } from "../context/UserContext";

function IncidentApproval() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();

  const [incident, setIncident] = useState(null);
  const [decision, setDecision] = useState("");
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userLoading && user) {
      loadIncident();
    }
  }, [userLoading, user, id]);

  async function loadIncident() {
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      alert("Unable to load incident.");
      return;
    }

    setIncident(data);
  }

  async function saveDecision() {
    if (!decision) {
      alert("Please select Approve or Reject.");
      return;
    }

    if (!user) {
      alert("User information not available.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("incident_approvals")
      .insert({
        incident_id: Number(id),
        approval_level: "HSE",
        approver_name: user.full_name,
        approver_email: user.email,
        decision: decision === "Rejected" ? "Disapproved" : "Approved",
        comments: comments,
        decision_date: new Date().toISOString(),
        approver_auth_user_id: user.auth_user_id,
      });

    if (error) {
      console.error(error);
      alert(error.message);
      setSaving(false);
      return;
    }

    alert("Decision saved successfully.");

    navigate("/incident/" + id);
  }

  if (userLoading || !incident) {
    return <h2>Loading...</h2>;
  }

  if (
    user.user_type !== "Admin" &&
    user.user_type !== "HSE"
  ) {
    return <h2>You are not authorized to approve incidents.</h2>;
  }

  return (
    <div className="container">

      <div className="header">

        <button
          className="back-button"
          onClick={() => navigate("/incident/" + id)}
        >
          ← Incident Details
        </button>

        <h1>HSE Approval</h1>

        <p>{incident.incident_no}</p>

      </div>

      <div className="card">

        <h2>Current Status</h2>

        <p>{incident.approval_status}</p>

        <br />

        <h2>Approval Comments</h2>

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
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Decision"}
        </button>

      </div>

    </div>
  );
}

export default IncidentApproval;
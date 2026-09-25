import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadUser() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.log("No active session");
      setUser(null);
      setLoading(false);
      return;
    }

    // Step 1: Load the logged-in employee
    const { data: employee, error: employeeError } = await supabase
  .from("employees")
  .select("*")
  .eq("auth_user_id", session.user.id)
  .single();

    if (employeeError) {
      console.error("Employee lookup failed:", employeeError);
      setUser(null);
      setLoading(false);
      return;
    }

    // Step 2: Load the employee's assigned site
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("name")
      .eq("id", employee.site_id)
      .single();

    if (siteError) {
      console.error("Site lookup failed:", siteError);
    }

    // Step 3: Combine employee and site information
    setUser({
      ...employee,
      site_name: site?.name || "Site not assigned",
    });

    setLoading(false);
  }

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        refreshUser: loadUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
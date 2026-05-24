type EventType = 
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "compliance_started"
  | "compliance_completed"
  | "requirement_started"
  | "requirement_submitted"
  | "requirement_abandoned"
  | "bid_submitted"
  | "bid_accepted"
  | "settings_updated"
  | "campaign_attributed";

export function trackEvent(eventType: EventType, metadata?: Record<string, any>) {
  console.log(`[Analytics] ${eventType}`, metadata);
  
  // Real persistence to /api/analytics/track
  const token = localStorage.getItem("omnibid_token");
  if (token) {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ eventType, metadata, path: window.location.pathname }),
    }).catch(err => console.error("Analytics failure:", err));
  }
}

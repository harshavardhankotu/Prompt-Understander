import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@omnibid/api-client-react";

// In development, the backend runs on port 3001; in production, we use relative /api proxied via Vercel
setBaseUrl(import.meta.env.PROD ? "" : "http://localhost:3001");

createRoot(document.getElementById("root")!).render(<App />);

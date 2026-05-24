import { describe, it, expect } from "vitest";

// Replicate CORS allowed check function
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://omnibid-client.vercel.app",
  "capacitor://localhost",
];

function checkOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // Allow non-browser requests
  return allowedOrigins.indexOf(origin) !== -1;
}

describe("CORS & Production Routing Security Audit", () => {
  it("should permit localhost clients and mobile Capacitor schemes", () => {
    expect(checkOrigin("http://localhost:3000")).toBe(true);
    expect(checkOrigin("http://localhost:5173")).toBe(true);
    expect(checkOrigin("capacitor://localhost")).toBe(true);
    expect(checkOrigin("https://omnibid-client.vercel.app")).toBe(true);
  });

  it("should allow server-to-server (origin-less) operations", () => {
    expect(checkOrigin(undefined)).toBe(true);
  });

  it("should block non-whitelisted blackhat domains in production", () => {
    expect(checkOrigin("http://malicious-hacker-site.com")).toBe(false);
    expect(checkOrigin("https://not-allowed-origin.net")).toBe(false);
  });
});

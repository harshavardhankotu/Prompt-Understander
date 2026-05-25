async function check() {
  try {
    const res = await fetch("http://localhost:3001/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    console.log("Status Code:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log("Body Preview:\n", text.substring(0, 1000));
  } catch (err) {
    console.error("Fetch Error:", err.message);
  }
}
check();

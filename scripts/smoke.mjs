import fs from "fs";

const BASE = process.env.BASE || "http://localhost:5000";
const fallback = ["/api/health", "/api/coating-systems"];

let endpoints = [];
try {
  const p = "audits/2024-10-24/architecture/endpoints.json";
  if (fs.existsSync(p)) {
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    endpoints = (Array.isArray(data) ? data : [])
      .filter(e => (e.method || "GET").toUpperCase() === "GET")
      .filter(e => typeof e.path === "string" && e.path.startsWith("/api/") && !e.path.includes(":"))
      .map(e => e.path);
  }
} catch {}

if (endpoints.length === 0) endpoints = fallback;

let ok = 0, fail = 0;
console.log(`\n== API smoke test against ${BASE} ==`);
for (const path of endpoints) {
  const url = BASE + path;
  try {
    const res = await fetch(url);
    const text = await res.text();
    const pass = res.ok;
    pass ? ok++ : fail++;
    console.log(`\n[${pass ? "PASS" : "FAIL"}] GET ${path} -> ${res.status}`);
    console.log(text.slice(0, 200));
  } catch (err) {
    fail++;
    console.log(`\n[FAIL] GET ${path} -> error: ${err?.message || err}`);
  }
}
console.log(`\nSummary: ${ok} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

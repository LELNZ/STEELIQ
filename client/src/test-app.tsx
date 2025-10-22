import { createRoot } from "react-dom/client";

function TestApp() {
  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>Test App is Working!</h1>
      <p>If you can see this, React is loading correctly.</p>
      <p>Time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<TestApp />);
  console.log("Test app rendered successfully");
} else {
  console.error("Root element not found");
}
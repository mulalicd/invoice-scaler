import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary, { reportClientError } from "./components/ErrorBoundary";

if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    reportClientError(e.message, "window.onerror", e.error?.stack, { filename: e.filename, lineno: e.lineno });
  });
  window.addEventListener("unhandledrejection", (e: any) => {
    const reason = e.reason;
    const msg = typeof reason === "string" ? reason : reason?.message ?? "Unhandled promise rejection";
    reportClientError(msg, "unhandledrejection", reason?.stack);
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

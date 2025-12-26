import { StrictMode } from "react";

// Global camera interception (Must be at the very top of entry point)
if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
  if (!window._nativeGUM) {
    window._nativeGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      try {
        const stream = await window._nativeGUM(constraints);
        if (!window._activeStreams) window._activeStreams = new Set();
        window._activeStreams.add(stream);
        return stream;
      } catch (e) {
        throw e;
      }
    };
  }
}
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>

    <App />

  </StrictMode>
);

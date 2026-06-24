import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Remove any service worker / cache left over from the old offline PWA build so
// the app always loads fresh and talks directly to the server / Supabase.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    })
    .catch(() => {});
  if (typeof caches !== "undefined") {
    caches
      .keys()
      .then((keys) => keys.forEach((key) => caches.delete(key)))
      .catch(() => {});
  }
}

createRoot(document.getElementById("root")!).render(<App />);

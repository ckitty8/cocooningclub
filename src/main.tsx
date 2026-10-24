import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { preparerConsentement } from "./lib/analytics";

// Consentement refusé par défaut avant tout chargement de Google (Consent Mode v2).
preparerConsentement();

createRoot(document.getElementById("root")!).render(<App />);

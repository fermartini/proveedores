/**
 * main.jsx
 * --------
 * Punto de entrada de React. Monta la aplicación en el elemento #root.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

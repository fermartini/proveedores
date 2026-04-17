/**
 * main.jsx
 * --------
 * Punto de entrada de React. Monta la aplicación en el elemento #root.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { InvoiceProvider } from "./context/InvoiceContext";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <InvoiceProvider>
        <App />
      </InvoiceProvider>
    </BrowserRouter>
  </StrictMode>
);

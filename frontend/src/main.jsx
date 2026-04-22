/**
 * main.jsx
 * --------
 * Punto de entrada de React. Monta la aplicación en el elemento #root.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { InvoiceProvider } from "./context/InvoiceContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <InvoiceProvider>
            <App />
          </InvoiceProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);

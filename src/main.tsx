import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ContestProvider } from "./context/ContestContext";
import "./theme/global.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AuthProvider>
        <ToastProvider>
          <ContestProvider>
            <App />
          </ContestProvider>
        </ToastProvider>
      </AuthProvider>
    </React.StrictMode>
  );
}

"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3600,
        className: "app-toast",
        success: { iconTheme: { primary: "#25d366", secondary: "#07140d" } },
        error: { iconTheme: { primary: "#ff6b6b", secondary: "#1b1011" } },
      }}
    />
  );
}

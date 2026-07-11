import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { ErrorBoundary } from "@/components/ErrorBoundary.tsx"

window.addEventListener("unhandledrejection", (event) => {
  console.error("[Global] Unhandled promise rejection:", event.reason)
  event.preventDefault()
})

window.addEventListener("error", (event) => {
  console.error("[Global] Uncaught error:", event.message, event.filename, event.lineno, event.colno)
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
)

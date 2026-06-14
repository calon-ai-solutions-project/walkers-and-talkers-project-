import { Routes, Route, Navigate } from "react-router-dom";
import CheckIn from "./pages/CheckIn";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { RequireAuth } from "./components/RequireAuth";

export default function App() {
  return (
    <Routes>
      {/* Public check-in landing — NFC taps and QR scans hit /c/{token} */}
      <Route path="/c/:token" element={<CheckIn />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />

      {/* Default → login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

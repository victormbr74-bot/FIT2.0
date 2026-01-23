import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ProtectedRoute } from "./ProtectedRoute";
import { DietPage } from "../pages/DietPage";
import { HomePage } from "../pages/HomePage";
import { OnboardingPage } from "../pages/OnboardingPage";
import { ProgressPage } from "../pages/ProgressPage";
import { SettingsPage } from "../pages/SettingsPage";
import { WorkoutPage } from "../pages/WorkoutPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { MainLayout } from "../components/MainLayout";

export function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/home" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/home" replace /> : <RegisterPage />}
      />
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<MainLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/workout" element={<WorkoutPage />} />
          <Route path="/diet" element={<DietPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route
        path="/"
        element={<Navigate to={user ? "/home" : "/login"} replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

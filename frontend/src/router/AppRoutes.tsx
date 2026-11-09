import { Route, Routes } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import { PublicOnlyRoute } from "./PublicRoute";
import LandingPage from "../pages/public/landingPage";
import LoginPage from "../pages/public/loginPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="login" element={<LoginPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

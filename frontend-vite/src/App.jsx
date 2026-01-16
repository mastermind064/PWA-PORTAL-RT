import { Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import WargaList from "./pages/WargaList.jsx";
import WargaDetail from "./pages/WargaDetail.jsx";
import ProfileComplete from "./pages/ProfileComplete.jsx";
import RtProfile from "./pages/RtProfile.jsx";
import RtInviteCode from "./pages/RtInviteCode.jsx";
import NotFound from "./pages/NotFound.jsx";

function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="warga" element={<WargaList />} />
        <Route path="warga/:id" element={<WargaDetail />} />
        <Route path="profil/lengkapi" element={<ProfileComplete />} />
        <Route path="rt/profil" element={<RtProfile />} />
        <Route path="rt/invite-code" element={<RtInviteCode />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;

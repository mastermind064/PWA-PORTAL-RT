import { Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import RequireRole from "./components/RequireRole.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import WargaList from "./pages/WargaList.jsx";
import WargaDetail from "./pages/WargaDetail.jsx";
import ProfileComplete from "./pages/ProfileComplete.jsx";
import RtProfile from "./pages/RtProfile.jsx";
import RtInviteCode from "./pages/RtInviteCode.jsx";
import WalletPage from "./pages/WalletPage.jsx";
import TopupPage from "./pages/TopupPage.jsx";
import TopupApprovalPage from "./pages/TopupApprovalPage.jsx";
import KasRtConfigPage from "./pages/KasRtConfigPage.jsx";
import KasRtDashboard from "./pages/KasRtDashboard.jsx";
import KasRtHistory from "./pages/KasRtHistory.jsx";
import BillingReminderPage from "./pages/BillingReminderPage.jsx";
import FeeCampaigns from "./pages/FeeCampaigns.jsx";
import FeePaymentsApproval from "./pages/FeePaymentsApproval.jsx";
import FeeBillings from "./pages/FeeBillings.jsx";
import FeeBillingHistory from "./pages/FeeBillingHistory.jsx";
import FeeBillingsAdmin from "./pages/FeeBillingsAdmin.jsx";
import SuperAdminDashboard from "./pages/SuperAdminDashboard.jsx";
import SuperAdminApproval from "./pages/SuperAdminApproval.jsx";
import SuperAdminWa from "./pages/SuperAdminWa.jsx";
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
        <Route
          path="warga"
          element={
            <RequireRole roles={["ADMIN_RT", "BENDAHARA", "SEKRETARIS"]}>
              <WargaList />
            </RequireRole>
          }
        />
        <Route
          path="warga/:id"
          element={
            <RequireRole roles={["ADMIN_RT", "BENDAHARA", "SEKRETARIS"]}>
              <WargaDetail />
            </RequireRole>
          }
        />
        <Route path="profil/lengkapi" element={<ProfileComplete />} />
        <Route path="rt/profil" element={<RtProfile />} />
        <Route path="rt/invite-code" element={<RtInviteCode />} />
        <Route
          path="wallet"
          element={
            <RequireRole roles={["WARGA"]}>
              <WalletPage />
            </RequireRole>
          }
        />
        <Route
          path="fees/billings"
          element={
            <RequireRole roles={["WARGA"]}>
              <FeeBillings />
            </RequireRole>
          }
        />
        <Route
          path="fees/billings/history"
          element={
            <RequireRole roles={["WARGA"]}>
              <FeeBillingHistory />
            </RequireRole>
          }
        />
        <Route
          path="topup"
          element={
            <RequireRole roles={["WARGA"]}>
              <TopupPage />
            </RequireRole>
          }
        />
        <Route
          path="topup/approval"
          element={
            <RequireRole roles={["ADMIN_RT", "BENDAHARA"]}>
              <TopupApprovalPage />
            </RequireRole>
          }
        />
        <Route
          path="kas-rt"
          element={
            <RequireRole roles={["ADMIN_RT", "BENDAHARA"]}>
              <KasRtConfigPage />
            </RequireRole>
          }
        />
        <Route
          path="kas-rt/dashboard"
          element={
            <RequireRole roles={["ADMIN_RT", "BENDAHARA"]}>
              <KasRtDashboard />
            </RequireRole>
          }
        />
        <Route
          path="kas-rt/history"
          element={
            <RequireRole roles={["ADMIN_RT", "BENDAHARA"]}>
              <KasRtHistory />
            </RequireRole>
          }
        />
        <Route
          path="billing/reminder"
          element={
            <RequireRole roles={["ADMIN_RT", "BENDAHARA"]}>
              <BillingReminderPage />
            </RequireRole>
          }
        />
        <Route
          path="fees/campaigns"
          element={
            <RequireRole roles={["ADMIN_RT", "BENDAHARA"]}>
              <FeeCampaigns />
            </RequireRole>
          }
        />
        <Route
          path="fees/approval"
          element={
            <RequireRole roles={["ADMIN_RT", "BENDAHARA"]}>
              <FeePaymentsApproval />
            </RequireRole>
          }
        />
        <Route
          path="fees/billings/admin"
          element={
            <RequireRole roles={["ADMIN_RT", "BENDAHARA"]}>
              <FeeBillingsAdmin />
            </RequireRole>
          }
        />
        <Route
          path="superadmin/dashboard"
          element={
            <RequireRole roles={["SUPER_ADMIN"]}>
              <SuperAdminDashboard />
            </RequireRole>
          }
        />
        <Route
          path="superadmin/approval"
          element={
            <RequireRole roles={["SUPER_ADMIN"]}>
              <SuperAdminApproval />
            </RequireRole>
          }
        />
        <Route
          path="superadmin/wa"
          element={
            <RequireRole roles={["SUPER_ADMIN"]}>
              <SuperAdminWa />
            </RequireRole>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;

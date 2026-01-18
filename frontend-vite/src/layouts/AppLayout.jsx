import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearSession } from "../utils/api.js";
import { getCurrentRole } from "../utils/session.js";

const AppLayout = () => {
  const navigate = useNavigate();
  const role = getCurrentRole();
  const isWarga = role === "WARGA";
  const canManageRt = role === "ADMIN_RT" || role === "BENDAHARA";
  const isSuperAdmin = role === "SUPER_ADMIN";

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <div className="brand-title">Portal RT</div>
            <div className="brand-subtitle">Tahap 1</div>
          </div>
        </div>
        <nav className="nav">
          <span className="nav-label">Utama</span>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          {!isSuperAdmin ? (
            <>
              <span className="nav-label">Warga</span>
              {!isWarga ? <NavLink to="/warga">Daftar Warga</NavLink> : null}
              {isWarga ? (
                <NavLink to="/profil/lengkapi">Lengkapi Profil</NavLink>
              ) : null}
            </>
          ) : null}
          {canManageRt ? (
            <>
              <span className="nav-label">RT</span>
              <NavLink to="/rt/profil">Profil RT</NavLink>
              <NavLink to="/rt/invite-code">Kode Undangan</NavLink>
            </>
          ) : null}
          {isSuperAdmin ? (
            <>
              <span className="nav-label">Super Admin</span>
              <NavLink to="/superadmin/dashboard">Dashboard Superadmin</NavLink>
              <NavLink to="/superadmin/approval">Approval RT</NavLink>
              <NavLink to="/superadmin/wa">WhatsApp API</NavLink>
            </>
          ) : null}
          <span className="nav-label">Keuangan</span>
          {isWarga ? (
            <>
              <NavLink to="/wallet">Wallet Warga</NavLink>
              <NavLink to="/topup">Topup Deposit</NavLink>
            </>
          ) : null}
          {canManageRt ? (
            <>
              <NavLink to="/topup/approval">Approval Topup</NavLink>
              <NavLink to="/kas-rt">Konfigurasi Kas RT</NavLink>
              <NavLink to="/kas-rt/dashboard">Dashboard Kas RT</NavLink>
              <NavLink to="/billing/reminder">Reminder Billing</NavLink>
            </>
          ) : null}
          <span className="nav-label">Akses</span>
          <button type="button" className="ghost" onClick={handleLogout}>
            Keluar
          </button>
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <h1 className="page-title">Portal RT</h1>
            <p className="page-subtitle">Multi-tenant RT management</p>
          </div>
          {isWarga ? (
            <div className="top-actions">
              <NavLink to="/profil/lengkapi" className="button">
                Lengkapi Profil
              </NavLink>
            </div>
          ) : null}
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

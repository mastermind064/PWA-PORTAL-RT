import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearSession } from "../utils/api.js";

const AppLayout = () => {
  const navigate = useNavigate();

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
          <span className="nav-label">Warga</span>
          <NavLink to="/warga">Daftar Warga</NavLink>
          <NavLink to="/profil/lengkapi">Lengkapi Profil</NavLink>
          <span className="nav-label">RT</span>
          <NavLink to="/rt/profil">Profil RT</NavLink>
          <NavLink to="/rt/invite-code">Kode Undangan</NavLink>
          <span className="nav-label">Akses</span>
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/register">Registrasi Warga</NavLink>
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
          <div className="top-actions">
            <NavLink to="/profil/lengkapi" className="button">
              Lengkapi Profil
            </NavLink>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

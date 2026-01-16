import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  return (
    <div className="auth-shell">
      <div className="auth-side">
        <h1>Portal RT</h1>
        <p>
          Sistem portal warga dan pengurus RT untuk pendaftaran, approval, dan
          transparansi kas.
        </p>
        <div className="auth-highlight">
          <div>
            <strong>Tahap 1</strong>
            <span>Registrasi warga + approval</span>
          </div>
          <div>
            <strong>Lengkapi profil</strong>
            <span>KK, keluarga, dokumen</span>
          </div>
        </div>
      </div>
      <div className="auth-main">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;

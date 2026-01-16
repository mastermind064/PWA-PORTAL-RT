import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";

const Dashboard = () => {
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStats = async () => {
      try {
        const pending = await apiRequest("/rt/members?status=PENDING", {
          auth: true,
        });
        const approved = await apiRequest("/rt/members?status=APPROVED", {
          auth: true,
        });
        const rejected = await apiRequest("/rt/members?status=REJECTED", {
          auth: true,
        });
        setStats({
          pending: pending.length,
          approved: approved.length,
          rejected: rejected.length,
        });
      } catch (err) {
        setError("Tidak dapat memuat statistik. Cek login admin RT.");
      }
    };
    loadStats();
  }, []);

  return (
    <div className="stack gap-lg">
      <div className="hero">
        <div>
          <h2>Dashboard Admin RT</h2>
          <p>Ringkasan pendaftaran warga tahap 1.</p>
        </div>
        <div className="hero-actions">
          <a className="button" href="/warga">
            Lihat daftar warga
          </a>
          <a className="button ghost" href="/profil/lengkapi">
            Lengkapi profil
          </a>
        </div>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <div className="grid-3">
        <div className="card">
          <span className="card-label">Menunggu approval</span>
          <strong>{stats.pending}</strong>
        </div>
        <div className="card">
          <span className="card-label">Disetujui</span>
          <strong>{stats.approved}</strong>
        </div>
        <div className="card">
          <span className="card-label">Ditolak</span>
          <strong>{stats.rejected}</strong>
        </div>
      </div>

      <div className="card">
        <h3>Checklist Tahap 1</h3>
        <ul className="checklist">
          <li>Registrasi warga via invite code</li>
          <li>Approval warga oleh admin RT</li>
          <li>Lengkapi profil KK + dokumen</li>
          <li>Outbox notifikasi WA</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;

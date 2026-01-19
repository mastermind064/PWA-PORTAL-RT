import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";
import AlertDismissible from "../components/AlertDismissible.jsx";

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
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="row">
        <div className="col-12">
          <div className="card mb-6">
            <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <h4 className="mb-1">Dashboard Admin RT</h4>
                <p className="text-muted mb-0">
                  Ringkasan pendaftaran warga tahap 1.
                </p>
              </div>
              <div className="d-flex gap-2">
                <a className="btn btn-primary" href="/warga">
                  Lihat daftar warga
                </a>
                <a className="btn btn-outline-primary" href="/profil/lengkapi">
                  Lengkapi profil
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDismissible
        type="danger"
        message={error}
        onClose={() => setError("")}
      />

      <div className="row g-4 mb-4">
        <div className="col-sm-6 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge bg-label-warning">Pending</span>
                <span className="text-muted">Menunggu approval</span>
              </div>
              <h3 className="mb-0">{stats.pending}</h3>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge bg-label-success">Approved</span>
                <span className="text-muted">Disetujui</span>
              </div>
              <h3 className="mb-0">{stats.approved}</h3>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge bg-label-danger">Rejected</span>
                <span className="text-muted">Ditolak</span>
              </div>
              <h3 className="mb-0">{stats.rejected}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Checklist Tahap 1</h5>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                <li className="list-group-item">
                  Registrasi warga via invite code
                </li>
                <li className="list-group-item">
                  Approval warga oleh admin RT
                </li>
                <li className="list-group-item">
                  Lengkapi profil KK + dokumen
                </li>
                <li className="list-group-item">Outbox notifikasi WA</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="col-lg-4 mt-4 mt-lg-0">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="mb-2">Catatan Admin</h5>
              <p className="text-muted mb-3">
                Pastikan approval warga dilakukan setiap hari kerja dan
                monitoring kas RT berjalan otomatis.
              </p>
              <a className="btn btn-outline-primary w-100" href="/topup/approval">
                Approval topup
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

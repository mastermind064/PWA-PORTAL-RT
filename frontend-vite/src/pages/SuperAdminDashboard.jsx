import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentRt, setRecentRt] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setError("");
    setLoading(true);
    try {
      const [statsData, rts] = await Promise.all([
        apiRequest("/super-admin/dashboard", { auth: true }),
        apiRequest("/super-admin/rts?status=PENDING_APPROVAL", { auth: true })
      ]);
      setStats(statsData);
      setRecentRt(rts.slice(0, 5));
    } catch (err) {
      setError(err.message || "Gagal memuat dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const statsCards = stats
    ? [
        { label: "Total RT Aktif", value: stats.activeRt },
        { label: "Total Warga", value: stats.totalWarga },
        {
          label: "Topup Bulan Ini",
          value: `Rp ${Number(stats.totalTopupMonth || 0).toLocaleString("id-ID")}`
        }
      ]
    : [];

  return (
    <div className="stack gap-lg">
      <div className="card hero">
        <div>
          <h2>Dashboard Superadmin</h2>
          <p className="muted">
            Ringkasan aktivitas seluruh RT, warga aktif, dan nominal topup.
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" className="btn btn-outline-secondary">
            Unduh Laporan
          </button>
          <button type="button" className="btn btn-primary">
            Kelola RT
          </button>
        </div>
      </div>

      {loading ? <div className="alert">Memuat data...</div> : null}
      {error ? <div className="alert error">{error}</div> : null}
      <div className="grid-3">
        {loading
          ? ["...", "...", "..."].map((item, index) => (
              <div className="card" key={`loading-${index}`}>
                <div className="card-label">Memuat</div>
                <h3>{item}</h3>
              </div>
            ))
          : statsCards.map((item) => (
              <div className="card" key={item.label}>
                <div className="card-label">{item.label}</div>
                <h3>{item.value}</h3>
              </div>
            ))}
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3>Ringkasan RT</h3>
            <p className="muted">Status RT terbaru yang perlu perhatian.</p>
          </div>
          <button type="button" className="btn btn-outline-secondary">
            Lihat Semua
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>RT</th>
              <th>Status</th>
              <th>Jumlah Warga</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="muted">
                  Memuat data...
                </td>
              </tr>
            ) : null}
            {!loading
              ? recentRt.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.status}</td>
                    <td>{item.rw || "-"}</td>
                  </tr>
                ))
              : null}
            {!loading && recentRt.length === 0 ? (
              <tr>
                <td colSpan={3} className="muted">
                  Tidak ada data.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;


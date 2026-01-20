import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../utils/api.js";

const formatCurrency = (value) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const KasRtDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    { label: "Saldo Kas RT", value: "Rp 0" },
    { label: "Debet Bulan Ini", value: "Rp 0" },
    { label: "Kredit Bulan Ini", value: "Rp 0" }
  ]);
  const [recentDebits, setRecentDebits] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setError("");
      try {
        const data = await apiRequest("/kas-rt/dashboard", { auth: true });
        setStats([
          { label: "Saldo Kas RT", value: formatCurrency(data.balance) },
          { label: "Debet Bulan Ini", value: formatCurrency(data.debitMonth) },
          { label: "Kredit Bulan Ini", value: formatCurrency(data.creditMonth) }
        ]);
        setRecentDebits(data.recentCharges || []);
      } catch (err) {
        setError(err.message || "Gagal memuat dashboard kas RT.");
      }
    };
    loadDashboard();
  }, []);

  return (
    <div className="stack gap-lg">
      <div className="card hero">
        <div>
          <h2>Dashboard Kas RT</h2>
          <p className="muted">
            Pantau saldo kas dan hasil auto-debit warga untuk bulan berjalan.
          </p>
        </div>
        <div className="hero-actions">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={async () => {
              const period = `${new Date().getFullYear()}-${String(
                new Date().getMonth() + 1
              ).padStart(2, "0")}`;
              const base =
                import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
              const token = window.localStorage.getItem("accessToken");
              const response = await fetch(
                `${base}/kas-rt/charges/export?period=${period}`,
                {
                  headers: token ? { Authorization: `Bearer ${token}` } : {}
                }
              );
              if (!response.ok) {
                return;
              }
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              window.open(url, "_blank", "noopener,noreferrer");
              setTimeout(() => URL.revokeObjectURL(url), 10000);
            }}
          >
            Export Laporan
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/kas-rt")}
          >
            Update Konfigurasi
          </button>
        </div>
      </div>

      <div className="grid-3">
        {stats.map((item) => (
          <div className="card" key={item.label}>
            <div className="card-label">{item.label}</div>
            <h3>{item.value}</h3>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3>Auto-debit Terbaru</h3>
            <p className="muted">Ringkasan hasil penarikan kas RT.</p>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate("/kas-rt/history")}
          >
            Lihat Semua
          </button>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Jenis</th>
              <th>Nominal</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentDebits.map((item, index) => (
              <tr key={`${item.period}-${index}`}>
                <td>{`Kas ${item.period} - ${item.fullName}`}</td>
                <td>{formatCurrency(item.amount)}</td>
                <td>{item.status === "PAID" ? "Berhasil" : "Gagal"}</td>
              </tr>
            ))}
            {recentDebits.length === 0 ? (
              <tr>
                <td colSpan={3} className="muted">
                  Belum ada data auto-debit.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KasRtDashboard;



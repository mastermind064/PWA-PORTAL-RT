import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";

const BillingReminderPage = () => {
  const [period, setPeriod] = useState("");
  const [reminders, setReminders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadReminders = async () => {
      setLoading(true);
      setError("");
      try {
        const query = period ? `?period=${period}` : "";
        const data = await apiRequest(`/kas-rt/reminders${query}`, {
          auth: true
        });
        setReminders(data);
      } catch (err) {
        setError(err.message || "Gagal memuat reminder billing.");
      } finally {
        setLoading(false);
      }
    };
    loadReminders();
  }, [period]);

  const handleRetry = async (id) => {
    setError("");
    try {
      await apiRequest(`/kas-rt/reminders/${id}/retry`, {
        method: "POST",
        auth: true
      });
      setReminders((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message || "Gagal retry debit.");
    }
  };

  return (
    <div className="stack gap-lg">
      <div className="card hero">
        <div>
          <h2>Reminder Billing</h2>
          <p className="muted">
            Jadwalkan pengingat iuran agar tagihan warga tertagih tepat waktu.
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" className="btn btn-primary">
            Buat Reminder
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3>Daftar Pengingat</h3>
            <p className="muted">Kelola jadwal kirim notifikasi iuran.</p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <input
              type="month"
              className="form-control"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            />
          </div>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Periode</th>
              <th>Warga</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {reminders.map((item) => (
              <tr key={item.id}>
                <td>{item.period}</td>
                <td>{item.residentName}</td>
                <td>Rp {Number(item.amount).toLocaleString("id-ID")}</td>
                <td>{item.status}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => handleRetry(item.id)}
                  >
                    Retry Debit
                  </button>
                </td>
              </tr>
            ))}
            {reminders.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  {loading ? "Memuat reminder..." : "Belum ada reminder."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Aksi Cepat</h3>
        <div className="grid-2">
          <div>
            <p className="muted">Kirim ulang reminder ke warga yang belum bayar.</p>
            <button type="button" className="btn btn-primary">
              Kirim Pengingat
            </button>
          </div>
          <div>
            <p className="muted">
              Atur jadwal reminder otomatis untuk bulan berikutnya.
            </p>
            <button type="button" className="btn btn-outline-secondary">
              Jadwalkan Otomatis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingReminderPage;



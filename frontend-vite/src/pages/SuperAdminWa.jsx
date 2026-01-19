import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";

const SuperAdminWa = () => {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [phoneFilter, setPhoneFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [retryingId, setRetryingId] = useState("");

  const loadStatus = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await apiRequest("/super-admin/wa/status", { auth: true });
      setStatus(data);
    } catch (err) {
      setError(err.message || "Gagal memuat status WA.");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (page = historyPage, phone = phoneFilter) => {
    setHistoryLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: "10",
        ...(phone ? { phone } : {})
      });
      const data = await apiRequest(`/super-admin/wa/history?${query.toString()}`, {
        auth: true
      });
      setHistory(data.items || []);
      setHistoryTotal(data.total || 0);
      setHistoryPage(data.page || 1);
    } catch (err) {
      setError(err.message || "Gagal memuat histori WA.");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadHistory(1, phoneFilter);
    const interval = setInterval(() => {
      loadStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await apiRequest("/super-admin/wa/register", {
        method: "POST",
        auth: true
      });
      setStatus(data);
    } catch (err) {
      setError(err.message || "Gagal memulai registrasi WA.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await apiRequest("/super-admin/wa/reset", {
        method: "POST",
        auth: true
      });
      setStatus(data);
    } catch (err) {
      setError(err.message || "Gagal reset sesi WA.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (id) => {
    setRetryingId(id);
    setError("");
    try {
      await apiRequest(`/super-admin/wa/history/${id}/retry`, {
        method: "POST",
        auth: true
      });
      await loadHistory(historyPage, phoneFilter);
    } catch (err) {
      setError(err.message || "Gagal retry notifikasi.");
    } finally {
      setRetryingId("");
    }
  };

  return (
    <div className="stack gap-lg">
      <div className="card hero">
        <div>
          <h2>WhatsApp API</h2>
          <p className="muted">
            Registrasi nomor WA untuk pengiriman notifikasi otomatis.
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" className="btn btn-outline-secondary" onClick={loadStatus}>
            Refresh Status
          </button>
          <button type="button" className="btn btn-primary" onClick={handleRegister}>
            Register WA
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={handleReset}>
            Reset Sesi
          </button>
        </div>
      </div>

      {loading ? <div className="alert">Memuat status...</div> : null}
      {error ? <div className="alert error">{error}</div> : null}

      <div className="grid-2">
        <div className="card">
          <div className="card-label">Status</div>
          <h3>{status?.state || "-"}</h3>
          <p className="muted">Nomor terdaftar: {status?.phone || "-"}</p>
        </div>
        <div className="card">
          <div className="card-label">QR Registrasi</div>
          {status?.qrDataUrl ? (
            <img
              src={status.qrDataUrl}
              alt="QR WhatsApp"
              style={{ width: "100%", maxWidth: "240px" }}
            />
          ) : (
            <p className="muted">
              QR akan muncul setelah klik Register WA.
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3>Histori Pengiriman WA</h3>
            <p className="muted">Log pengiriman terakhir.</p>
          </div>
          <div className="actions">
            <input
              type="text"
              placeholder="Filter nomor (62xxxx)"
              value={phoneFilter}
              onChange={(event) => setPhoneFilter(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  loadHistory(1, phoneFilter);
                }
              }}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">PENDING</option>
              <option value="SENT">SENT</option>
              <option value="FAILED">FAILED</option>
            </select>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => loadHistory(1, phoneFilter)}
            >
              Refresh
            </button>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Tujuan</th>
              <th>Template</th>
              <th>Status</th>
              <th>Dikirim</th>
              <th>Detail</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {historyLoading ? (
              <tr>
                <td colSpan={6} className="muted">
                  Memuat histori...
                </td>
              </tr>
            ) : null}
            {!historyLoading
              ? history
                  .filter((item) =>
                    statusFilter === "ALL"
                      ? true
                      : (item.log_status || item.status) === statusFilter
                  )
                  .map((item) => (
                  <tr key={item.id}>
                    <td>{item.to_phone}</td>
                    <td>{item.template_key}</td>
                    <td>
                      <span
                        className={`badge ${
                          (item.log_status || item.status || "").toLowerCase()
                        }`}
                      >
                        {item.log_status || item.status}
                      </span>
                    </td>
                    <td>
                      {item.sent_at
                        ? new Date(item.sent_at).toLocaleString("id-ID")
                        : "-"}
                    </td>
                    <td>
                      <details>
                        <summary className="link">Lihat</summary>
                        <pre className="payload">
                          {JSON.stringify(
                            {
                              payload: item.payload ? item.payload : {},
                              response: item.response_text || null
                            },
                            null,
                            2
                          )}
                        </pre>
                      </details>
                    </td>
                    <td>
                      {(item.log_status || item.status) === "FAILED" ? (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() =>
                            handleRetry(item.outbox_id || item.id)
                          }
                          disabled={retryingId === (item.outbox_id || item.id)}
                        >
                          {retryingId === (item.outbox_id || item.id)
                            ? "Mengirim..."
                            : "Retry"}
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              : null}
            {!historyLoading &&
            history.filter((item) =>
              statusFilter === "ALL"
                ? true
                : (item.log_status || item.status) === statusFilter
            ).length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Belum ada histori.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="pagination">
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={historyPage <= 1 || historyLoading}
            onClick={() => loadHistory(historyPage - 1, phoneFilter)}
          >
            Prev
          </button>
          <span className="muted">
            Hal {historyPage} dari {Math.max(1, Math.ceil(historyTotal / 10))}
          </span>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={
              historyLoading ||
              historyPage >= Math.max(1, Math.ceil(historyTotal / 10))
            }
            onClick={() => loadHistory(historyPage + 1, phoneFilter)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminWa;


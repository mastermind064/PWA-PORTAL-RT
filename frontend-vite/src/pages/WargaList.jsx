import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../utils/api.js";

const statusOptions = ["PENDING", "APPROVED", "REJECTED"];

const WargaList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const status = useMemo(
    () => searchParams.get("status") || "PENDING",
    [searchParams]
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest(`/rt/members?status=${status}`, {
          auth: true,
        });
        setItems(data || []);
      } catch (err) {
        setError("Gagal memuat daftar warga. Pastikan login admin RT.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [status]);

  return (
    <div className="stack gap-lg">
      <div className="card">
        <h2>Daftar Warga</h2>
        <p className="muted">
          Menampilkan warga dengan status: <strong>{status}</strong>
        </p>
        <div className="chip-group">
          {statusOptions.map((option) => (
            <button
              key={option}
              className={`chip ${status === option ? "active" : ""}`}
              onClick={() => setSearchParams({ status: option })}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <div className="card">
        {loading ? (
          <p>Memuat data...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>No HP</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.fullName}</td>
                  <td>{item.phone || "-"}</td>
                  <td>
                    <span className={`badge ${item.approvalStatus?.toLowerCase()}`}>
                      {item.approvalStatus}
                    </span>
                  </td>
                  <td>
                    <Link to={`/warga/${item.id}`} className="link">
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    Belum ada data.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default WargaList;

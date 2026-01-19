import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";

const KasRtConfigPage = () => {
  const [isActive, setIsActive] = useState(false);
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [debitDay, setDebitDay] = useState("1");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadConfig = async () => {
      setError("");
      try {
        const data = await apiRequest("/kas-rt/config", { auth: true });
        if (data) {
          setIsActive(Boolean(data.is_active));
          setMonthlyAmount(String(data.monthly_amount || ""));
          setDebitDay(String(data.debit_day_of_month || "1"));
        }
      } catch (err) {
        setError(err.message || "Gagal memuat konfigurasi");
      }
    };

    loadConfig();
  }, []);

  const handleSave = async () => {
    setError("");
    setSuccess("");
    try {
      await apiRequest("/kas-rt/config", {
        method: "PUT",
        auth: true,
        body: JSON.stringify({
          isActive,
          monthlyAmount: Number(monthlyAmount || 0),
          debitDayOfMonth: Number(debitDay || 1)
        })
      });
      setSuccess("Konfigurasi kas RT tersimpan.");
    } catch (err) {
      setError(err.message || "Gagal menyimpan konfigurasi");
    }
  };

  return (
    <div className="stack gap-lg">
      <div className="card">
        <h2>Konfigurasi Kas RT</h2>
        <p className="muted">Atur nominal dan tanggal auto-debit.</p>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="form-check form-switch mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="kas-rt-active"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <label className="form-check-label" htmlFor="kas-rt-active">
              Aktifkan auto-debit
            </label>
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="kas-rt-monthly">
                Nominal bulanan
              </label>
              <input
                id="kas-rt-monthly"
                className="form-control"
                type="number"
                value={monthlyAmount}
                onChange={(event) => setMonthlyAmount(event.target.value)}
                min="0"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="kas-rt-debit-day">
                Tanggal debit
              </label>
              <input
                id="kas-rt-debit-day"
                className="form-control"
                type="number"
                value={debitDay}
                onChange={(event) => setDebitDay(event.target.value)}
                min="1"
                max="28"
              />
            </div>
          </div>
          {error ? <div className="alert error mt-3">{error}</div> : null}
          {success ? <div className="alert success mt-3">{success}</div> : null}
          <div className="mt-3">
            <button className="btn btn-primary" type="button" onClick={handleSave}>
              Simpan konfigurasi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KasRtConfigPage;


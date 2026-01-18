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
        <label className="checkbox">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Aktifkan auto-debit
        </label>
        <div className="grid-2">
          <label>
            Nominal bulanan
            <input
              type="number"
              value={monthlyAmount}
              onChange={(event) => setMonthlyAmount(event.target.value)}
              min="0"
            />
          </label>
          <label>
            Tanggal debit
            <input
              type="number"
              value={debitDay}
              onChange={(event) => setDebitDay(event.target.value)}
              min="1"
              max="28"
            />
          </label>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        {success ? <div className="alert success">{success}</div> : null}
        <button className="button" type="button" onClick={handleSave}>
          Simpan konfigurasi
        </button>
      </div>
    </div>
  );
};

export default KasRtConfigPage;

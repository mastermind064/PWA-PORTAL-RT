import { useState } from "react";
import { apiRequest } from "../utils/api.js";

const TopupPage = () => {
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!amount || Number(amount) <= 0) {
      setError("Nominal topup tidak valid.");
      return;
    }
    if (!file) {
      setError("Bukti transfer wajib diupload.");
      return;
    }

    const formData = new FormData();
    formData.append("amount", amount);
    formData.append("file", file);

    setLoading(true);
    try {
      const token = window.localStorage.getItem("accessToken");
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/wallet/topup`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        }
      );
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Gagal mengirim topup");
      }
      setSuccess("Topup berhasil dikirim, menunggu approval.");
      setAmount("");
      setFile(null);
    } catch (err) {
      setError(err.message || "Gagal mengirim topup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack gap-lg">
      <div className="card">
        <h2>Topup Deposit</h2>
        <p className="muted">Upload bukti transfer untuk verifikasi.</p>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <label>
          Nominal topup
          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            min="1"
          />
        </label>
        <label>
          Bukti transfer (jpg/png/pdf)
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>
        {error ? <div className="alert error">{error}</div> : null}
        {success ? <div className="alert success">{success}</div> : null}
        <button className="button" type="submit" disabled={loading}>
          {loading ? "Mengirim..." : "Kirim topup"}
        </button>
      </form>
    </div>
  );
};

export default TopupPage;

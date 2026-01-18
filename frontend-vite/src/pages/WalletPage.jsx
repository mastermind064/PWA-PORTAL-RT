import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";

const WalletPage = () => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadWallet = async () => {
      setError("");
      try {
        const walletData = await apiRequest("/wallet/me", { auth: true });
        setWallet(walletData);
        const txData = await apiRequest("/wallet/transactions", { auth: true });
        setTransactions(txData);
      } catch (err) {
        setError(err.message || "Gagal memuat wallet");
      }
    };

    loadWallet();
  }, []);

  return (
    <div className="stack gap-lg">
      <div className="card">
        <h2>Wallet Warga</h2>
        {wallet ? (
          <div className="wallet-summary">
            <span>Saldo</span>
            <strong>Rp {Number(wallet.balance || 0).toLocaleString("id-ID")}</strong>
          </div>
        ) : (
          <p>Memuat wallet...</p>
        )}
        {error ? <div className="alert error">{error}</div> : null}
      </div>

      <div className="card">
        <h3>Transaksi</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Tipe</th>
              <th>Arah</th>
              <th>Nominal</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>{new Date(tx.created_at).toLocaleDateString("id-ID")}</td>
                <td>{tx.type}</td>
                <td>{tx.direction}</td>
                <td>Rp {Number(tx.amount).toLocaleString("id-ID")}</td>
              </tr>
            ))}
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  Belum ada transaksi.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WalletPage;

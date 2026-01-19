const KasRtDashboard = () => {
  const stats = [
    { label: "Saldo Kas RT", value: "Rp 12.450.000" },
    { label: "Debet Bulan Ini", value: "Rp 2.100.000" },
    { label: "Kredit Bulan Ini", value: "Rp 650.000" }
  ];

  const recentDebits = [
    { name: "Kas Februari", amount: "Rp 50.000", status: "Berhasil" },
    { name: "Kas Februari", amount: "Rp 50.000", status: "Gagal" },
    { name: "Kas Februari", amount: "Rp 50.000", status: "Berhasil" }
  ];

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
          <button type="button" className="btn btn-outline-secondary">
            Export Laporan
          </button>
          <button type="button" className="btn btn-primary">
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
          <button type="button" className="btn btn-outline-secondary">
            Lihat Semua
          </button>
        </div>
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
              <tr key={`${item.name}-${index}`}>
                <td>{item.name}</td>
                <td>{item.amount}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KasRtDashboard;



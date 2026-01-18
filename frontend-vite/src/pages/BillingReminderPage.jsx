const BillingReminderPage = () => {
  const reminders = [
    {
      name: "Kas Maret",
      dueDate: "15/03/2025",
      target: "120 warga",
      status: "Berjalan"
    },
    {
      name: "Iuran Kebersihan",
      dueDate: "20/03/2025",
      target: "120 warga",
      status: "Menunggu"
    }
  ];

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
          <button type="button" className="button ghost">
            Template Pesan
          </button>
          <button type="button" className="button">
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
          <button type="button" className="button ghost">
            Filter
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Nama Billing</th>
              <th>Jatuh Tempo</th>
              <th>Target</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reminders.map((item, index) => (
              <tr key={`${item.name}-${index}`}>
                <td>{item.name}</td>
                <td>{item.dueDate}</td>
                <td>{item.target}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Aksi Cepat</h3>
        <div className="grid-2">
          <div>
            <p className="muted">Kirim ulang reminder ke warga yang belum bayar.</p>
            <button type="button" className="button">
              Kirim Pengingat
            </button>
          </div>
          <div>
            <p className="muted">
              Atur jadwal reminder otomatis untuk bulan berikutnya.
            </p>
            <button type="button" className="button ghost">
              Jadwalkan Otomatis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingReminderPage;


const NotFound = () => {
  return (
    <div className="card">
      <h2>Halaman tidak ditemukan</h2>
      <p className="muted">Periksa kembali URL yang kamu buka.</p>
      <a className="btn btn-primary" href="/">
        Kembali ke dashboard
      </a>
    </div>
  );
};

export default NotFound;


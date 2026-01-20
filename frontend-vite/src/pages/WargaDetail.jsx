import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest, openDocument } from "../utils/api.js";

const WargaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const detail = await apiRequest(`/residents/${id}`, { auth: true });
        setData(detail);
      } catch (err) {
        setError(err.message || "Gagal memuat detail warga");
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [id]);

  const handleAction = async (action) => {
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/rt/members/${id}/${action}`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ reason: "" }),
      });
      navigate("/warga");
    } catch (err) {
      setError(err.message || "Gagal memperbarui status");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="card">Memuat detail...</div>;
  }

  if (!data) {
    return <div className="card">Data tidak ditemukan.</div>;
  }

  const { resident, familyCard, familyMembers, documents } = data;
  const ktpDoc = documents?.find((doc) => doc.type === "KTP");
  const kkDoc = documents?.find((doc) => doc.type === "KK");

  return (
    <div className="stack gap-lg">
      {error ? <div className="alert error">{error}</div> : null}

      <div className="card">
        <h2>Detail Warga</h2>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="resident-name">
                Nama
              </label>
              <input
                id="resident-name"
                className="form-control"
                type="text"
                value={resident.fullName || ""}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="resident-phone">
                No HP
              </label>
              <input
                id="resident-phone"
                className="form-control"
                type="text"
                value={resident.phone || "-"}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="resident-address">
                Alamat
              </label>
              <input
                id="resident-address"
                className="form-control"
                type="text"
                value={resident.address || "-"}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="resident-status">
                Status
              </label>
              <input
                id="resident-status"
                className="form-control"
                type="text"
                value={resident.approvalStatus || "-"}
                readOnly
              />
            </div>
          </div>
        </div>
        <div className="actions">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => handleAction("approve")}
            disabled={saving}
          >
            Approve
          </button>
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() => handleAction("reject")}
            disabled={saving}
          >
            Reject
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Data KK</h3>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="kk-number">
                Nomor KK
              </label>
              <input
                id="kk-number"
                className="form-control"
                type="text"
                value={familyCard?.kkNumber || "-"}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="kk-address">
                Alamat KK
              </label>
              <input
                id="kk-address"
                className="form-control"
                type="text"
                value={familyCard?.address || "-"}
                readOnly
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Dokumen</h3>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="doc-ktp">
                KTP
              </label>
              <div className="d-flex align-items-center gap-2">
                <input
                  id="doc-ktp"
                  className="form-control"
                  type="text"
                  value={ktpDoc?.originalName || "-"}
                  readOnly
                />
                {ktpDoc?.id ? (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => openDocument(ktpDoc.id)}
                  >
                    Lihat
                  </button>
                ) : null}
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="doc-kk">
                KK
              </label>
              <div className="d-flex align-items-center gap-2">
                <input
                  id="doc-kk"
                  className="form-control"
                  type="text"
                  value={kkDoc?.originalName || "-"}
                  readOnly
                />
                {kkDoc?.id ? (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => openDocument(kkDoc.id)}
                  >
                    Lihat
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Anggota Keluarga</h3>
        <div className="card-body">
          {(familyMembers || []).map((member) => (
            <div className="row g-2 mb-2" key={`${member.fullName}-${member.relationship}`}>
              <div className="col-md-6">
                <input
                  className="form-control"
                  type="text"
                  value={member.fullName}
                  readOnly
                />
              </div>
              <div className="col-md-6">
                <input
                  className="form-control"
                  type="text"
                  value={member.relationship}
                  readOnly
                />
              </div>
            </div>
          ))}
          {(familyMembers || []).length === 0 ? (
            <div className="muted">Belum ada data keluarga.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default WargaDetail;



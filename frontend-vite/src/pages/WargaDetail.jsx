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
        <div className="grid-2">
          <div>
            <span className="muted">Nama</span>
            <p>{resident.fullName}</p>
          </div>
          <div>
            <span className="muted">No HP</span>
            <p>{resident.phone || "-"}</p>
          </div>
          <div>
            <span className="muted">Alamat</span>
            <p>{resident.address || "-"}</p>
          </div>
          <div>
            <span className="muted">Status</span>
            <p>{resident.approvalStatus}</p>
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
        <div className="grid-2">
          <div>
            <span className="muted">Nomor KK</span>
            <p>{familyCard?.kkNumber || "-"}</p>
          </div>
          <div>
            <span className="muted">Alamat KK</span>
            <p>{familyCard?.address || "-"}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Dokumen</h3>
        <div className="grid-2">
          <div>
            <span className="muted">KTP</span>
            <p>
              {ktpDoc?.originalName ? (
                <span className="muted">{ktpDoc.originalName}</span>
              ) : null}
              {ktpDoc?.id ? (
                <button
                  type="button"
                  className="link"
                  onClick={() => openDocument(ktpDoc.id)}
                >
                  Lihat dokumen
                </button>
              ) : (
                "-"
              )}
            </p>
          </div>
          <div>
            <span className="muted">KK</span>
            <p>
              {kkDoc?.originalName ? (
                <span className="muted">{kkDoc.originalName}</span>
              ) : null}
              {kkDoc?.id ? (
                <button
                  type="button"
                  className="link"
                  onClick={() => openDocument(kkDoc.id)}
                >
                  Lihat dokumen
                </button>
              ) : (
                "-"
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Anggota Keluarga</h3>
        <ul className="list">
          {(familyMembers || []).map((member) => (
            <li key={`${member.fullName}-${member.relationship}`}>
              <strong>{member.fullName}</strong> · {member.relationship}
            </li>
          ))}
          {(familyMembers || []).length === 0 ? (
            <li className="muted">Belum ada data keluarga.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
};

export default WargaDetail;


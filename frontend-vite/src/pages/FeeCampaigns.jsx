import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";

const defaultForm = {
  name: "",
  type: "ONE_TIME",
  amountType: "FIXED",
  fixedAmount: ""
};

const FeeCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editForm, setEditForm] = useState(null);
  const [period, setPeriod] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const loadCampaigns = async () => {
    setError("");
    try {
      const data = await apiRequest("/fees/campaigns", { auth: true });
      setCampaigns(data);
    } catch (err) {
      setError(err.message || "Gagal memuat campaign.");
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreate = async () => {
    setError("");
    setSuccess("");
    if (!form.name) {
      setError("Nama campaign wajib diisi.");
      return;
    }
    if (form.amountType === "FIXED" && !form.fixedAmount) {
      setError("Nominal iuran wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("/fees/campaigns", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          amountType: form.amountType,
          fixedAmount:
            form.amountType === "FIXED" ? Number(form.fixedAmount) : null
        })
      });
      setSuccess("Campaign berhasil dibuat.");
      setForm(defaultForm);
      await loadCampaigns();
    } catch (err) {
      setError(err.message || "Gagal membuat campaign.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (campaignId) => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await apiRequest(`/fees/campaigns/${campaignId}/billings`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ period: period || null })
      });
      setSuccess("Billing berhasil dibuat.");
    } catch (err) {
      setError(err.message || "Gagal membuat billing.");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (campaign) => {
    setEditForm({
      id: campaign.id,
      name: campaign.name,
      type: campaign.type,
      amountType: campaign.amount_type,
      fixedAmount: campaign.fixed_amount || "",
      status: campaign.status
    });
  };

  const cancelEdit = () => {
    setEditForm(null);
  };

  const handleUpdate = async () => {
    if (!editForm) return;
    setError("");
    setSuccess("");
    if (!editForm.name) {
      setError("Nama campaign wajib diisi.");
      return;
    }
    if (editForm.amountType === "FIXED" && !editForm.fixedAmount) {
      setError("Nominal iuran wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      await apiRequest(`/fees/campaigns/${editForm.id}`, {
        method: "PUT",
        auth: true,
        body: JSON.stringify({
          name: editForm.name,
          type: editForm.type,
          amountType: editForm.amountType,
          fixedAmount:
            editForm.amountType === "FIXED"
              ? Number(editForm.fixedAmount)
              : null,
          status: editForm.status
        })
      });
      setSuccess("Campaign berhasil diperbarui.");
      setEditForm(null);
      await loadCampaigns();
    } catch (err) {
      setError(err.message || "Gagal memperbarui campaign.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (campaignId) => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await apiRequest(`/fees/campaigns/${campaignId}/close`, {
        method: "POST",
        auth: true
      });
      setSuccess("Campaign berhasil ditutup.");
      await loadCampaigns();
    } catch (err) {
      setError(err.message || "Gagal menutup campaign.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (campaignId) => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await apiRequest(`/fees/campaigns/${campaignId}/activate`, {
        method: "POST",
        auth: true
      });
      setSuccess("Campaign berhasil diaktifkan.");
      await loadCampaigns();
    } catch (err) {
      setError(err.message || "Gagal mengaktifkan campaign.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack gap-lg">
      <div className="card">
        <h2>Campaign Iuran</h2>
        <p className="muted">Buat iuran baru dan generate billing untuk warga.</p>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="fee-name">
                Nama iuran
              </label>
              <input
                id="fee-name"
                className="form-control"
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="fee-type">
                Tipe
              </label>
              <select
                id="fee-type"
                className="form-select"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                <option value="ONE_TIME">ONE_TIME</option>
                <option value="RECURRING">RECURRING</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="fee-amount">
                Nominal
              </label>
              <input
                id="fee-amount"
                className="form-control"
                type="number"
                min="1"
                value={form.fixedAmount}
                onChange={(event) =>
                  setForm({ ...form, fixedAmount: event.target.value })
                }
                disabled={form.amountType === "FLEXIBLE"}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="fee-amount-type">
                Jenis Nominal
              </label>
              <select
                id="fee-amount-type"
                className="form-select"
                value={form.amountType}
                onChange={(event) =>
                  setForm({ ...form, amountType: event.target.value })
                }
              >
                <option value="FIXED">FIXED</option>
                <option value="FLEXIBLE">FLEXIBLE</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? "Menyimpan..." : "Simpan Campaign"}
            </button>
          </div>
        </div>
      </div>

      {editForm ? (
        <div className="card">
          <div className="card-body">
            <h3 className="mb-3">Edit Campaign</h3>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="edit-fee-name">
                  Nama iuran
                </label>
                <input
                  id="edit-fee-name"
                  className="form-control"
                  type="text"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm({ ...editForm, name: event.target.value })
                  }
                />
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="edit-fee-type">
                  Tipe
                </label>
                <select
                  id="edit-fee-type"
                  className="form-select"
                  value={editForm.type}
                  onChange={(event) =>
                    setEditForm({ ...editForm, type: event.target.value })
                  }
                >
                  <option value="ONE_TIME">ONE_TIME</option>
                  <option value="RECURRING">RECURRING</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="edit-fee-amount">
                  Nominal
                </label>
                <input
                  id="edit-fee-amount"
                  className="form-control"
                  type="number"
                  min="1"
                  value={editForm.fixedAmount}
                  onChange={(event) =>
                    setEditForm({ ...editForm, fixedAmount: event.target.value })
                  }
                  disabled={editForm.amountType === "FLEXIBLE"}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="edit-fee-amount-type">
                  Jenis Nominal
                </label>
                <select
                  id="edit-fee-amount-type"
                  className="form-select"
                  value={editForm.amountType}
                  onChange={(event) =>
                    setEditForm({ ...editForm, amountType: event.target.value })
                  }
                >
                  <option value="FIXED">FIXED</option>
                  <option value="FLEXIBLE">FLEXIBLE</option>
                </select>
              </div>
            </div>
            <div className="mt-3 d-flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUpdate}
                disabled={loading}
              >
                {loading ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={cancelEdit}>
                Batal
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="section-header">
          <div>
            <h3>Daftar Campaign</h3>
            <p className="muted">Generate billing per campaign.</p>
          </div>
          <input
            type="month"
            className="form-control"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Tipe</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.type}</td>
                <td>Rp {Number(item.fixed_amount || 0).toLocaleString("id-ID")}</td>
                <td>{item.status}</td>
                <td>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleGenerate(item.id)}
                    >
                      Generate
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => startEdit(item)}
                    >
                      Edit
                    </button>
                    {item.status === "ACTIVE" ? (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleClose(item.id)}
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm"
                        onClick={() => handleActivate(item.id)}
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Belum ada campaign.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {error ? <div className="alert error mt-3">{error}</div> : null}
        {success ? <div className="alert success mt-3">{success}</div> : null}
      </div>
    </div>
  );
};

export default FeeCampaigns;



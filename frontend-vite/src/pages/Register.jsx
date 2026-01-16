import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { apiRequest } from "../utils/api.js";

const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

const Register = () => {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!captchaToken) {
        throw new Error("Captcha wajib diisi.");
      }
      await apiRequest("/auth/register-warga", {
        method: "POST",
        body: JSON.stringify({
          inviteCode,
          fullName,
          phone,
          address,
          email,
          password,
          recaptchaToken: captchaToken,
        }),
      });
      navigate("/login");
    } catch (err) {
      setError(err.message || "Registrasi gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card auth-card wide" onSubmit={handleSubmit}>
      <h2>Registrasi Warga</h2>
      <p className="muted">
        Daftar akun dulu, lengkapi profil setelah disetujui Admin RT.
      </p>
      <div className="form-section">
        <h4>Data RT</h4>
        <label>
          Kode undangan RT
          <input
            type="text"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            required
          />
        </label>
      </div>
      <div className="form-section">
        <h4>Data Warga</h4>
        <div className="grid-2">
          <label>
            Nama lengkap
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>
          <label>
            No HP
            <input
              type="text"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
        </div>
        <label>
          Alamat domisili
          <input
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
        <div className="grid-2">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Kata sandi
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
        </div>
      </div>

      {recaptchaKey ? (
        <div className="recaptcha">
          <ReCAPTCHA sitekey={recaptchaKey} onChange={setCaptchaToken} />
        </div>
      ) : (
        <div className="alert error">
          VITE_RECAPTCHA_SITE_KEY belum diatur.
        </div>
      )}

      {error ? <div className="alert error">{error}</div> : null}

      <button type="submit" className="button" disabled={loading}>
        {loading ? "Memproses..." : "Daftar akun"}
      </button>
      <p className="muted">
        Sudah punya akun? <a href="/login">Masuk</a>
      </p>
    </form>
  );
};

export default Register;

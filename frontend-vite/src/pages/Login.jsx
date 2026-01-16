import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { apiRequest } from "../utils/api.js";

const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

const Login = () => {
  const navigate = useNavigate();
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
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, recaptchaToken: captchaToken }),
      });
      window.localStorage.setItem("accessToken", data.accessToken);
      window.localStorage.setItem("refreshToken", data.refreshToken);
      navigate("/");
    } catch (err) {
      setError(err.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card auth-card" onSubmit={handleSubmit}>
      <h2>Masuk</h2>
      <p className="muted">Gunakan akun warga atau admin RT.</p>
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
        {loading ? "Memproses..." : "Masuk"}
      </button>
      <p className="muted">
        Belum terdaftar? <a href="/register">Daftar warga</a>
      </p>
    </form>
  );
};

export default Login;

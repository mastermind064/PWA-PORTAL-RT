import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { apiRequest } from "../utils/api.js";
import AlertDismissible from "../components/AlertDismissible.jsx";

const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => {
      setError("");
    }, 10000);
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <form id="formAuthentication" className="mb-5" onSubmit={handleSubmit}>
      <h4 className="mb-1">Selamat datang di Portal RT</h4>
      <p className="mb-5">Masuk untuk mengelola warga dan layanan RT.</p>

      <div className="form-floating form-floating-outline mb-5 form-control-validation">
        <input
          type="email"
          className="form-control"
          id="email"
          placeholder="Masukkan email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label htmlFor="email">Email</label>
      </div>

      <div className="mb-5">
        <div className="form-password-toggle form-control-validation">
          <div className="input-group input-group-merge">
            <div className="form-floating form-floating-outline">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                id="password"
                placeholder="Kata sandi"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <label htmlFor="password">Kata sandi</label>
            </div>
            <span
              role="button"
              tabIndex={0}
              className="input-group-text cursor-pointer password-toggle"
              aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
              onMouseDown={(event) => event.preventDefault()}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => setShowPassword((prev) => !prev)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setShowPassword((prev) => !prev);
                }
              }}
              style={{ pointerEvents: "auto", zIndex: 3 }}
            >
              {showPassword ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 3L21 21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10.5 10.5C9.67157 11.3284 9.67157 12.6716 10.5 13.5C11.3284 14.3284 12.6716 14.3284 13.5 13.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M6.42 6.42C4.66 7.6 3.24 9.2 2 12C3.9 16.1 7.6 18 12 18C13.77 18 15.44 17.64 16.95 16.95"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9.88 5.08C10.56 5.02 11.27 5 12 5C16.4 5 20.1 6.9 22 12C21.16 13.84 20.09 15.18 18.82 16.15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 12C3.9 7.9 7.6 6 12 6C16.4 6 20.1 7.9 22 12C20.1 16.1 16.4 18 12 18C7.6 18 3.9 16.1 2 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </span>
          </div>
        </div>
      </div>

      {recaptchaKey ? (
        <div className="mb-5">
          <ReCAPTCHA sitekey={recaptchaKey} onChange={setCaptchaToken} />
        </div>
      ) : (
        <div className="alert error">VITE_RECAPTCHA_SITE_KEY belum diatur.</div>
      )}

      <AlertDismissible
        type="danger"
        message={error}
        onClose={() => setError("")}
      />

      <div className="mb-5">
        <button
          type="submit"
          className="btn btn-primary d-grid w-100"
          disabled={loading}
        >
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </div>

      <p className="text-center mb-5">
        <span>Belum punya akun?</span>{" "}
        <a href="/register">
          <span>Daftar warga</span>
        </a>
      </p>
    </form>
  );
};

export default Login;

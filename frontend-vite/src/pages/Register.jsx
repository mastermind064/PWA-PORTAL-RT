import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { apiRequest } from "../utils/api.js";
import AlertDismissible from "../components/AlertDismissible.jsx";

const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

const Register = () => {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [block, setBlock] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formTouched, setFormTouched] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const validateForm = () => {
    const nextErrors = {};
    if (!inviteCode) {
      nextErrors.inviteCode = "Kode undangan wajib diisi";
    }
    if (!fullName) {
      nextErrors.fullName = "Nama lengkap wajib diisi";
    }
    if (!phone) {
      nextErrors.phone = "Nomor HP wajib diisi";
    }
    if (!block) {
      nextErrors.block = "Blok wajib diisi";
    }
    if (!email) {
      nextErrors.email = "Email wajib diisi";
    }
    if (!password) {
      nextErrors.password = "Kata sandi wajib diisi";
    }
    if (!otpVerified) {
      nextErrors.otp = "OTP belum diverifikasi";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setFormTouched(true);
    setLoading(true);
    try {
      if (!captchaToken) {
        throw new Error("Captcha wajib diisi.");
      }
      if (!validateForm()) {
        throw new Error("Periksa kembali input yang belum valid.");
      }
      await apiRequest("/auth/register-warga", {
        method: "POST",
        body: JSON.stringify({
          inviteCode,
          fullName,
          phone,
          address: block,
          email,
          password,
          recaptchaToken: captchaToken,
        }),
      });
      setShowSuccessModal(true);
    } catch (err) {
      setError(err.message || "Registrasi gagal");
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

  const validatePhone = (value) => {
    if (!value) {
      return "Nomor HP wajib diisi";
    }
    if (value.length < 9) {
      return "Nomor HP terlalu pendek";
    }
    return "";
  };

  const handlePhoneChange = (event) => {
    const raw = event.target.value || "";
    const digits = raw.replace(/\D/g, "").slice(0, 20);
    setPhone(digits);
    setOtpVerified(false);
    setOtpSent(false);
    setOtpCode("");
    setOtpMessage("");
    setFieldErrors((prev) => ({
      ...prev,
      phone: validatePhone(digits)
    }));
  };

  const handleRequestOtp = async () => {
    const nextErrors = {};
    if (!inviteCode) {
      nextErrors.inviteCode = "Kode undangan wajib diisi";
    }
    const phoneError = validatePhone(phone);
    if (phoneError) {
      nextErrors.phone = phoneError;
    }
    setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setOtpLoading(true);
    setOtpMessage("");
    try {
      const data = await apiRequest("/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ phone, inviteCode })
      });
      setOtpSent(true);
      setOtpVerified(false);
      setOtpCountdown(60);
      const displayPhone = phone ? ` ${phone}` : "";
      const baseMessage = `OTP telah dikirim ke nomor HP${displayPhone}.`;
      const message = data.code ? `${baseMessage} Kode: ${data.code}` : baseMessage;
      setOtpMessage(message);
    } catch (err) {
      setError(err.message || "Gagal mengirim OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      setFieldErrors((prev) => ({ ...prev, otp: "OTP wajib diisi" }));
      return;
    }
    setOtpLoading(true);
    setOtpMessage("");
    try {
      await apiRequest("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, code: otpCode })
      });
      setOtpVerified(true);
      setOtpMessage("OTP terverifikasi.");
      setFieldErrors((prev) => ({ ...prev, otp: "" }));
    } catch (err) {
      setError(err.message || "OTP tidak valid");
      setOtpVerified(false);
    } finally {
      setOtpLoading(false);
    }
  };

  useEffect(() => {
    if (otpCountdown <= 0) return undefined;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  return (
    <form id="formAuthentication" className="mb-5" onSubmit={handleSubmit}>
      <h4 className="mb-1">Registrasi Warga</h4>
      <p className="mb-5">
        Buat akun untuk akses layanan Portal RT.
      </p>

      <div className="row g-3">
        <div className="col-12 col-md-4">
          <div className="form-floating form-floating-outline form-control-validation">
            <input
              type="text"
              className="form-control"
              id="inviteCode"
              placeholder="Kode undangan"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              required
            />
            <label htmlFor="inviteCode">Kode undangan RT</label>
            {fieldErrors.inviteCode ? (
              <div className="invalid-feedback d-block">
                {fieldErrors.inviteCode}
              </div>
            ) : null}
          </div>
        </div>
        <div className="col-12 col-md-8">
          <div className="form-floating form-floating-outline form-control-validation">
            <input
              type="text"
              className="form-control"
              id="fullName"
              placeholder="Nama lengkap"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
            <label htmlFor="fullName">Nama lengkap</label>
            {fieldErrors.fullName ? (
              <div className="invalid-feedback d-block">
                {fieldErrors.fullName}
              </div>
            ) : null}
          </div>
        </div>
        <div className="col-12 col-md-7">
          <div className="form-floating form-floating-outline form-control-validation">
            <input
              type="text"
              className="form-control"
              id="phone"
              placeholder="No HP"
              value={phone}
              onChange={handlePhoneChange}
              inputMode="numeric"
              maxLength={20}
              disabled={otpVerified}
            />
            <label htmlFor="phone">No HP</label>
            {fieldErrors.phone ? (
              <div className="invalid-feedback d-block">{fieldErrors.phone}</div>
            ) : null}
          </div>
        </div>
        <div className="col-12 col-md-5 d-grid">
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={handleRequestOtp}
              disabled={otpLoading || otpCountdown > 0 || otpVerified}
            >
            {otpLoading
              ? "Mengirim..."
              : otpSent
              ? "Kirim Ulang OTP"
              : "Kirim OTP"}
          </button>
          {otpCountdown > 0 ? (
            <span className="muted mt-1">
              Kirim ulang dalam 00:{String(otpCountdown).padStart(2, "0")}
            </span>
          ) : null}
        </div>
        <div className="col-12 col-md-7">
          <div className="form-floating form-floating-outline form-control-validation">
            <input
              type="text"
              className="form-control"
              id="otpCode"
              placeholder="Kode OTP"
              value={otpCode}
              onChange={(event) =>
                setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              maxLength={6}
              disabled={otpVerified}
            />
            <label htmlFor="otpCode">Kode OTP</label>
            {fieldErrors.otp ? (
              <div className="invalid-feedback d-block">{fieldErrors.otp}</div>
            ) : null}
          </div>
        </div>
        <div className="col-12 col-md-5 d-grid">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleVerifyOtp}
              disabled={otpLoading || !otpSent || otpVerified}
            >
            {otpLoading ? "Memverifikasi..." : "Verifikasi OTP"}
          </button>
        </div>
        <div className="col-12 col-md-4">
          <div className="form-floating form-floating-outline form-control-validation">
            <input
              type="text"
              className="form-control"
              id="block"
              placeholder="Blok"
              value={block}
              onChange={(event) =>
                setBlock(event.target.value.toUpperCase().slice(0, 3))
              }
              maxLength={3}
            />
            <label htmlFor="block">Blok</label>
            {fieldErrors.block ? (
              <div className="invalid-feedback d-block">{fieldErrors.block}</div>
            ) : null}
          </div>
        </div>
        <div className="col-12 col-md-8">
          <div className="form-floating form-floating-outline form-control-validation">
            <input
              type="email"
              className="form-control"
              id="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <label htmlFor="email">Email</label>
            {fieldErrors.email ? (
              <div className="invalid-feedback d-block">{fieldErrors.email}</div>
            ) : null}
          </div>
        </div>
        
      </div>

      <div className="row g-3 mt-2">
        <div className="col-12">
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
                aria-label={
                  showPassword ? "Sembunyikan password" : "Lihat password"
                }
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
            {fieldErrors.password ? (
              <div className="invalid-feedback d-block">{fieldErrors.password}</div>
            ) : null}
          </div>
        </div>
      </div>

      <AlertDismissible
        type="success"
        message={otpMessage}
        onClose={() => setOtpMessage("")}
        className="mt-3"
      />

      {recaptchaKey ? (
        <div className="mt-4 mb-5">
          <ReCAPTCHA sitekey={recaptchaKey} onChange={setCaptchaToken} />
        </div>
      ) : (
        <AlertDismissible
          type="danger"
          message="VITE_RECAPTCHA_SITE_KEY belum diatur."
          onClose={() => setError("")}
        />
      )}

      <AlertDismissible
        type="danger"
        message={error}
        onClose={() => setError("")}
      />
      {formTouched && !otpVerified ? (
        <AlertDismissible
          type="danger"
          message="OTP HP wajib diverifikasi."
          onClose={() => setFormTouched(false)}
        />
      ) : null}

      <button
        type="submit"
        className="btn btn-primary d-grid w-100 mb-5"
        disabled={loading || !otpVerified}
      >
        {loading ? "Memproses..." : "Daftar akun"}
      </button>
      <p className="text-center mb-5">
        <span>Sudah punya akun?</span>{" "}
        <a href="/login">
          <span>Masuk</span>
        </a>
      </p>
      {showSuccessModal ? (
        <>
          <div className="modal fade show" role="dialog" style={{ display: "block" }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Pendaftaran Berhasil</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => navigate("/login")}
                  />
                </div>
                <div className="modal-body">
                  <p>
                    Terima kasih, pendaftaran Anda sudah diterima. Status akun
                    menunggu approval RT.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate("/login")}
                  >
                    Masuk
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      ) : null}
    </form>
  );
};

export default Register;

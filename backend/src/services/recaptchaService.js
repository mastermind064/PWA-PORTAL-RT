const verifyRecaptcha = async (token) => {
  if (!token) {
    const error = new Error("Captcha wajib diisi");
    error.status = 400;
    throw error;
  }
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    const error = new Error("Konfigurasi reCAPTCHA belum lengkap");
    error.status = 500;
    throw error;
  }

  const body = new URLSearchParams();
  body.append("secret", secret);
  body.append("response", token);

  const response = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    }
  );
  const data = await response.json();
  if (!data.success) {
    const error = new Error("Captcha tidak valid");
    error.status = 400;
    throw error;
  }
};

module.exports = { verifyRecaptcha };

const decodeBase64Url = (value) => {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");
  return atob(normalized);
};

export const getAccessPayload = () => {
  const token = window.localStorage.getItem("accessToken");
  if (!token) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  try {
    const payload = decodeBase64Url(parts[1]);
    return JSON.parse(payload);
  } catch (err) {
    return null;
  }
};

export const getCurrentRole = () => {
  const payload = getAccessPayload();
  return payload?.role || null;
};


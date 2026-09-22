const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

export function registerAccount(data) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function sendOtp(data) {
  return request("/api/auth/send-otp", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function verifyOtp(data) {
  return request("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function login(data) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data)
  });
}
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const PI_API_KEY = process.env.PI_API_KEY;
const PI_API_BASE = "https://api.minepi.com";

if (!PI_API_KEY) {
  console.warn("⚠️ تحذير: PI_API_KEY غير مضبوط في متغيرات البيئة (.env)");
}

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "*"
  })
);
app.use(express.json());

const processedPayments = new Map();

async function piRequest(path, options = {}) {
  if (!PI_API_KEY) {
    throw new Error("PI_API_KEY is missing on the server");
  }

  const response = await fetch(`${PI_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Key ${PI_API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || data.message || `Pi API error (${response.status})`);
    err.status = response.status;
    err.details = data;
    throw err;
  }
  return data;
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "MEHA PUZZLE Pi Backend",
    piConfigured: Boolean(PI_API_KEY)
  });
});

app.post("/api/pi/verify-auth", async (req, res) => {
  try {
    const { accessToken, user } = req.body || {};
    if (!accessToken) {
      return res.status(400).json({ ok: false, error: "accessToken is required" });
    }

    const piRes = await fetch(`${PI_API_BASE}/v2/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const verifiedUser = await piRes.json().catch(() => ({}));
    if (!piRes.ok) {
      return res.status(401).json({ ok: false, error: "Invalid Pi accessToken", details: verifiedUser });
    }

    return res.json({
      ok: true,
      user: verifiedUser || user || null
    });
  } catch (err) {
    console.error("verify-auth error:", err);
    return res.status(500).json({ ok: false, error: "Failed to verify Pi authentication" });
  }
});

app.post("/api/pi/approve", async (req, res) => {
  try {
    const { paymentId } = req.body || {};
    if (!paymentId) {
      return res.status(400).json({ ok: false, error: "paymentId is required" });
    }

    const existing = processedPayments.get(paymentId);
    if (existing && existing.status === "completed") {
      return res.json({ ok: true, alreadyCompleted: true, payment: existing.payment });
    }

    const approvedPayment = await piRequest(`/v2/payments/${encodeURIComponent(paymentId)}/approve`, {
      method: "POST"
    });

    processedPayments.set(paymentId, {
      status: "approved",
      payment: approvedPayment,
      updatedAt: Date.now()
    });

    return res.json({ ok: true, payment: approvedPayment });
  } catch (err) {
    console.error("approve error:", err);
    return res.status(err.status || 500).json({
      ok: false,
      error: err.message || "Payment approval failed",
      details: err.details || null
    });
  }
});

app.post("/api/pi/complete", async (req, res) => {
  try {
    const { paymentId, txid, itemType } = req.body || {};
    if (!paymentId) {
      return res.status(400).json({ ok: false, error: "paymentId is required" });
    }

    const existing = processedPayments.get(paymentId);
    if (existing && existing.status === "completed") {
      return res.json({
        ok: true,
        alreadyCompleted: true,
        itemType: existing.itemType || itemType || null,
        payment: existing.payment
      });
    }

    const currentPayment = await piRequest(`/v2/payments/${encodeURIComponent(paymentId)}`, {
      method: "GET"
    });

    if (!currentPayment.status?.developer_approved) {
      await piRequest(`/v2/payments/${encodeURIComponent(paymentId)}/approve`, {
        method: "POST"
      });
    }

    const completedPayment = await piRequest(`/v2/payments/${encodeURIComponent(paymentId)}/complete`, {
      method: "POST",
      body: JSON.stringify({ txid })
    });

    const resolvedItemType = itemType || currentPayment.metadata?.itemType || null;

    processedPayments.set(paymentId, {
      status: "completed",
      itemType: resolvedItemType,
      payment: completedPayment,
      completedAt: Date.now()
    });

    return res.json({
      ok: true,
      itemType: resolvedItemType,
      payment: completedPayment
    });
  } catch (err) {
    console.error("complete error:", err);
    return res.status(err.status || 500).json({
      ok: false,
      error: err.message || "Payment completion failed",
      details: err.details || null
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ MEHA PUZZLE Pi Backend running on http://localhost:${PORT}`);
});

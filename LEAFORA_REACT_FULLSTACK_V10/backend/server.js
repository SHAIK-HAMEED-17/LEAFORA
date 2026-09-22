require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET =
  process.env.JWT_SECRET || "leafora-development-secret";

const database = new sqlite3.Database("./leafora.db");

database.serialize(() => {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      mobile TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone_verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;

function generateDemoOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createDemoOtpResponse(mobile) {
  const code = generateDemoOtp();
  otpStore.set(mobile, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS
  });

  return {
    configured: true,
    status: "demo",
    code,
    expiresInSeconds: OTP_TTL_MS / 1000
  };
}

function checkDemoOtp(mobile, code) {
  const record = otpStore.get(mobile);

  if (!record) return false;

  if (Date.now() > record.expiresAt) {
    otpStore.delete(mobile);
    return false;
  }

  if (record.code !== code) return false;

  otpStore.delete(mobile);
  return true;
}

function normalizeMobile(mobile) {
  const digits = String(mobile || "").replace(/\D/g, "");

  if (digits.length !== 10) {
    return null;
  }

  return `+91${digits}`;
}

function findUserByMobile(mobile) {
  return new Promise((resolve, reject) => {
    database.get(
      "SELECT * FROM users WHERE mobile = ?",
      [mobile],
      (error, row) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(row);
      }
    );
  });
}

function findUserByIdentifier(identifier) {
  return new Promise((resolve, reject) => {
    database.get(
      "SELECT * FROM users WHERE username = ? OR mobile = ?",
      [identifier, identifier],
      (error, row) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(row);
      }
    );
  });
}

function insertUser(username, mobile, passwordHash) {
  return new Promise((resolve, reject) => {
    database.run(
      `
        INSERT INTO users
        (username, mobile, password_hash, phone_verified)
        VALUES (?, ?, ?, 0)
      `,
      [username, mobile, passwordHash],
      function (error) {
        if (error) {
          reject(error);
          return;
        }

        resolve(this.lastID);
      }
    );
  });
}

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    otpMode: "demo",
    message: "A new demo OTP is generated for each send request."
  });
});

app.post("/api/auth/register", async (request, response) => {
  try {
    const {
      username,
      password,
      mobile
    } = request.body;

    if (!username || !password || !mobile) {
      return response.status(400).json({
        message: "Username, password and mobile are required."
      });
    }

    const normalizedMobile = normalizeMobile(mobile);

    if (!normalizedMobile) {
      return response.status(400).json({
        message: "Enter a valid 10-digit Indian mobile number."
      });
    }

    const existingUser = await findUserByMobile(normalizedMobile);

    if (existingUser) {
      return response.status(409).json({
        message:
          "This mobile number already exists. Please use Login."
      });
    }

    const existingUsername = await findUserByIdentifier(username);

    if (existingUsername) {
      return response.status(409).json({
        message:
          "This username already exists. Please choose another username."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await insertUser(
      username.trim(),
      normalizedMobile,
      passwordHash
    );

    response.json({
      message: "Account created. Continue with mobile verification."
    });
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Could not create the account."
    });
  }
});

app.post("/api/auth/send-otp", async (request, response) => {
  try {
    const normalizedMobile = normalizeMobile(
      request.body.mobile
    );

    if (!normalizedMobile) {
      return response.status(400).json({
        message: "Enter a valid mobile number."
      });
    }

    const user = await findUserByMobile(normalizedMobile);

    if (!user) {
      return response.status(404).json({
        message: "Mobile number is not registered."
      });
    }

    const result = createDemoOtpResponse(normalizedMobile);

    response.json({
      message: "Demo OTP generated successfully.",
      status: result.status,
      demoOtp: result.code
    });
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message:
        "OTP could not be generated. Please try again."
    });
  }
});

app.post("/api/auth/verify-otp", async (request, response) => {
  try {
    const normalizedMobile = normalizeMobile(
      request.body.mobile
    );

    const code = String(request.body.code || "").trim();

    if (!normalizedMobile || !code) {
      return response.status(400).json({
        message: "Mobile number and OTP are required."
      });
    }

    const approved = checkDemoOtp(normalizedMobile, code);

    if (!approved) {
      return response.status(401).json({
        message: "Incorrect or expired OTP."
      });
    }

    database.run(
      `
        UPDATE users
        SET phone_verified = 1
        WHERE mobile = ?
      `,
      [normalizedMobile]
    );

    const user = await findUserByMobile(normalizedMobile);

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        mobile: user.mobile
      },
      JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    response.json({
      message: "Mobile verified successfully.",
      token,
      user: {
        username: user.username,
        mobile: user.mobile
      }
    });
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "OTP verification failed."
    });
  }
});

app.post("/api/auth/login", async (request, response) => {
  try {
    const {
      identifier,
      password
    } = request.body;

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      return response.status(401).json({
        message:
          "This account does not exist. Please create an account."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return response.status(401).json({
        message: "Incorrect password."
      });
    }

    if (!user.phone_verified) {
      return response.status(403).json({
        message:
          "Please complete mobile OTP verification first."
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        mobile: user.mobile
      },
      JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    response.json({
      message: "Login successful.",
      token,
      user: {
        username: user.username,
        mobile: user.mobile
      }
    });
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Login failed."
    });
  }
});

app.listen(PORT, () => {
  console.log("");
  console.log("======================================");
  console.log("LEAFORA BACKEND");
  console.log(`Running on http://localhost:${PORT}`);
  console.log("OTP mode: DEMO (new code generated on every send)");
  console.log("======================================");
  console.log("");
});
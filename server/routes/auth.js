
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomInt, createHash } from "crypto";
import User from "../models/User.js";
import PendingUser from "../models/PendingUser.js";
import auth from "../middleware/auth.js";
import sendEmail from "../utils/sendEmail.js";

const router = express.Router();

const createToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const hashOTP = (otp) =>
  createHash("sha256").update(otp).digest("hex");

// REGISTER: Generate and send OTP
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please fill in all fields.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: cleanEmail });

    if (existing) {
      return res.status(400).json({
        message: "Email is already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = randomInt(100000, 1000000).toString();

    await PendingUser.findOneAndUpdate(
      { email: cleanEmail },
      {
        name,
        email: cleanEmail,
        password: hashedPassword,
        otp: hashOTP(otp),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      await sendEmail(cleanEmail, otp);
    } catch (emailError) {
      await PendingUser.deleteOne({ email: cleanEmail });
      console.error("Email sending failed:", emailError.message);

      return res.status(500).json({
        message: "Unable to send OTP. Please try again.",
      });
    }

    res.json({
      message: "OTP sent successfully to your email.",
    });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
});

// VERIFY OTP: Create account
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const pending = await PendingUser.findOne({
      email: cleanEmail,
    });

    if (!pending) {
      return res.status(400).json({
        message: "No pending registration found. Register again.",
      });
    }

    if (pending.expiresAt < new Date()) {
      await PendingUser.deleteOne({ email: cleanEmail });

      return res.status(400).json({
        message: "OTP expired. Please register again.",
      });
    }

    if (pending.otp !== hashOTP(String(otp))) {
      return res.status(400).json({
        message: "Invalid OTP. Please try again.",
      });
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.password,
    });

    await PendingUser.deleteOne({ email: cleanEmail });

    res.status(201).json({
      message: "Email verified and account created successfully.",
      token: createToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("OTP verification error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter your email and password.",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    const match =
      user && (await bcrypt.compare(password, user.password));

    if (!match) {
      return res.status(400).json({
        message: "Invalid email or password.",
      });
    }

    res.json({
      token: createToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// GET LOGGED-IN USER
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.userId).select("-password");
  res.json(user);
});

export default router;

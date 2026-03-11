import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { User } from "../models/User.js";
import { authRequired } from "../middleware/auth.js";
import { verifyFirebaseToken, isFirebaseEnabled } from "../config/firebase.js";

const router = Router();

const tokenFor = (user) =>
  jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: String(user._id),
    expiresIn: config.jwtExpiresIn
  });

// Verify Firebase phone authentication token
router.post("/verify-firebase-phone", async (req, res) => {
  const { idToken } = req.body;
  
  if (!idToken) {
    return res.status(400).json({ message: "Firebase ID token is required" });
  }

  if (!isFirebaseEnabled()) {
    return res.status(503).json({ 
      message: "Firebase authentication not configured",
      hint: "Configure FIREBASE_SERVICE_ACCOUNT_JSON environment variable"
    });
  }

  try {
    // Verify the Firebase ID token
    const decodedToken = await verifyFirebaseToken(idToken);
    
    // Extract phone number from Firebase token
    const phoneNumber = decodedToken.phone_number;
    
    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number not found in Firebase token" });
    }

    // Return verified phone number
    res.json({ 
      verified: true, 
      phoneNumber,
      uid: decodedToken.uid,
      message: "Phone verified successfully via Firebase"
    });
  } catch (err) {
    console.error("Firebase token verification failed:", err.message);
    res.status(401).json({ message: "Invalid Firebase token", error: err.message });
  }
});

// Check Firebase configuration status
router.get("/firebase-status", (_req, res) => {
  res.json({ 
    enabled: isFirebaseEnabled(),
    message: isFirebaseEnabled() 
      ? "Firebase Phone Authentication is enabled" 
      : "Firebase Phone Authentication is not configured"
  });
});

router.post("/register", async (req, res) => {
  const { name, username, phone, email, password, latitude, longitude } = req.body;
  if (!password || (!phone && !email && !username)) {
    return res.status(400).json({ message: "password and phone/email/username are required" });
  }

  const normalizedUsername =
    (username || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 24) || undefined;

  const candidates = [];
  if (email) candidates.push({ email: String(email).toLowerCase() });
  if (normalizedUsername) candidates.push({ username: normalizedUsername });
  if (!candidates.length) {
    return res.status(400).json({ message: "Provide a valid username/email/phone" });
  }

  const existing = await User.findOne({
    $or: candidates
  });
  if (existing) return res.status(409).json({ message: "User already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const displayName = (name || normalizedUsername || phone || email || "Citizen").trim();
  const user = await User.create({
    name: displayName,
    username: normalizedUsername,
    phone,
    email: email ? String(email).toLowerCase() : undefined,
    passwordHash,
    role: "USER",
    location: {
      latitude,
      longitude,
      updatedAt: new Date()
    }
  });

  const token = tokenFor(user);
  res.status(201).json({ token, user });
});

router.post("/admin/register", async (req, res) => {
  const { name = "Admin", username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "username and password are required" });

  const normalized = String(username).toLowerCase().trim();
  const existing = await User.findOne({ username: normalized });
  if (existing) return res.status(409).json({ message: "Admin username already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await User.create({
    name,
    username: normalized,
    phone: `admin_${Date.now()}`,
    email: `${normalized}@local`,
    passwordHash,
    role: "ADMIN",
    status: "SAFE"
  });

  const token = tokenFor(admin);
  res.status(201).json({ token, user: admin });
});

router.post("/login", async (req, res) => {
  const { identifier, password, role } = req.body;
  if (!identifier || !password) return res.status(400).json({ message: "Missing credentials" });

  const normalized = String(identifier).toLowerCase().trim();
  const user = await User.findOne({
    $or: [{ phone: identifier }, { email: normalized }, { username: normalized }]
  });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  if (role && user.role !== role) return res.status(403).json({ message: "Role mismatch" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = tokenFor(user);
  res.json({ token, user });
});

router.post("/admin/seed", async (_req, res) => {
  const passwordHash = await bcrypt.hash("admin", 10);
  const exists = await User.findOne({ role: "ADMIN" });

  if (exists) {
    exists.username = "admin";
    exists.email = exists.email || "admin@local";
    exists.passwordHash = passwordHash;
    await exists.save();
    return res.json({ message: "Admin reset", username: "admin", password: "admin" });
  }

  const admin = await User.create({
    name: "Admin",
    username: "admin",
    phone: `admin_${Date.now()}`,
    email: "admin@local",
    passwordHash,
    role: "ADMIN",
    status: "SAFE"
  });

  res.status(201).json({ message: "Admin seeded", username: admin.username, password: "admin" });
});

router.get("/me", authRequired, async (req, res) => {
  res.json({ user: req.user });
});

export default router;

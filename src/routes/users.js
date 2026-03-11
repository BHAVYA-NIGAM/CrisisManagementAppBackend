import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { HelpOffer } from "../models/HelpOffer.js";
import { SosAlert } from "../models/SosAlert.js";
import { distanceKm } from "../utils/geo.js";
import { emitEvent } from "../services/realtime.js";
import { EmergencyContact } from "../models/EmergencyContact.js";
import { simulateNotify } from "../services/notify.js";

const router = Router();

const broadcastStatus = (user) => {
  emitEvent("status_updated", {
    userId: user._id,
    name: user.name,
    status: user.status,
    location: user.location,
    timestamp: new Date().toISOString()
  });
};

router.get("/nearby", authRequired, async (req, res) => {
  const radiusKm = Number(req.query.radiusKm || 5);
  const { latitude, longitude } = req.user.location || {};
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.json({ users: [] });
  }

  if (req.user.safetySettings?.allowInSafetyCircle === false) {
    return res.json({ users: [], disabled: true });
  }

  const users = await User.find({ role: "USER", _id: { $ne: req.user._id } })
    .select("name status location safetySettings");
  const nearby = users
    .map((u) => {
      const d = distanceKm(latitude, longitude, u.location?.latitude, u.location?.longitude);
      return {
        id: u._id,
        name: u.name,
        status: u.status,
        distanceKm: Number.isFinite(d) ? Number(d.toFixed(2)) : null,
        location: u.location,
        safetySettings: u.safetySettings
      };
    })
    .filter((u) => u.distanceKm !== null && u.distanceKm <= radiusKm)
    .filter((u) => u.safetySettings?.allowInSafetyCircle !== false)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json({ users: nearby, disabled: false });
});

router.patch("/location", authRequired, async (req, res) => {
  const { latitude, longitude } = req.body;
  req.user.location = { latitude, longitude, updatedAt: new Date() };
  await req.user.save();
  broadcastStatus(req.user);
  res.json({ user: req.user });
});

router.post("/status", authRequired, async (req, res) => {
  const { status, countdownMinutes = 5, autoCall = false, userMessage = "" } = req.body;
  if (!["SAFE", "EMERGENCY", "POSSIBLE_RISK"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  req.user.status = status;
  req.user.riskCountdownEndsAt =
    status === "POSSIBLE_RISK" ? new Date(Date.now() + countdownMinutes * 60 * 1000) : null;
  await req.user.save();

  if (status === "SAFE") {
    await HelpOffer.updateMany(
      {
        userId: req.user._id,
        status: "PENDING"
      },
      { status: "EXPIRED" }
    );
  }

  const contacts = await EmergencyContact.find({ userId: req.user._id });
  const buddies = await User.find({ role: "USER", _id: { $ne: req.user._id } }).select("name location");
  const localBuddies = buddies.filter((u) => {
    const d = distanceKm(
      req.user.location?.latitude,
      req.user.location?.longitude,
      u.location?.latitude,
      u.location?.longitude
    );
    return d <= 5;
  });

  const payload = {
    name: req.user.name,
    status,
    location: req.user.location,
    timestamp: new Date().toISOString(),
    autoCall,
    userMessage
  };

  contacts.forEach((c) => simulateNotify({ channel: "contact", to: c.number, payload }));
  localBuddies.forEach((b) => simulateNotify({ channel: "buddy", to: b.name, payload }));
  if (status !== "SAFE") {
    simulateNotify({ channel: "police", to: "POLICE_CONTROL", payload });
  }

  if (status === "EMERGENCY" || status === "POSSIBLE_RISK") {
    // Check if user already has an active SOS alert
    const existingAlert = await SosAlert.findOne({ 
      userId: req.user._id, 
      status: { $ne: "RESOLVED" } 
    });
    
    if (!existingAlert) {
      await SosAlert.create({
        userId: req.user._id,
        mode: status === "EMERGENCY" ? "NEED_HELP" : "URGENT_HELP",
        latitude: req.user.location?.latitude,
        longitude: req.user.location?.longitude,
        notes: autoCall ? "Auto-call requested" : (status === "EMERGENCY" ? "Manual emergency mode" : "Possible risk reported"),
        userMessage
      });
      emitEvent("sos_created", { userId: req.user._id, name: req.user.name, mode: status === "EMERGENCY" ? "NEED_HELP" : "URGENT_HELP", userMessage });
    } else {
      // Update existing alert with new message if provided
      if (userMessage) {
        existingAlert.userMessage = userMessage;
        existingAlert.notes = status === "EMERGENCY" ? "Manual emergency mode" : "Possible risk reported";
        await existingAlert.save();
      }
    }
  }

  broadcastStatus(req.user);

  res.json({ user: req.user });
});

router.get("/admin/overview", authRequired, requireRole("ADMIN"), async (_req, res) => {
  const [total, safe, emergency, risk] = await Promise.all([
    User.countDocuments({ role: "USER" }),
    User.countDocuments({ role: "USER", status: "SAFE" }),
    User.countDocuments({ role: "USER", status: "EMERGENCY" }),
    User.countDocuments({ role: "USER", status: "POSSIBLE_RISK" })
  ]);

  const activeAlerts = await SosAlert.find({ status: { $ne: "RESOLVED" } })
    .sort({ timestamp: -1 })
    .populate("userId", "name location status");

  res.json({
    stats: { total, safe, emergency, risk, unknown: Math.max(total - safe - emergency - risk, 0) },
    activeAlerts
  });
});

router.get("/admin/locations", authRequired, requireRole("ADMIN"), async (_req, res) => {
  const users = await User.find({ role: "USER" }).select("name status location created_at");
  const locations = users
    .filter((u) => typeof u.location?.latitude === "number" && typeof u.location?.longitude === "number")
    .map((u) => ({
      id: u._id,
      name: u.name,
      status: u.status,
      latitude: u.location.latitude,
      longitude: u.location.longitude,
      updatedAt: u.location.updatedAt || u.created_at
    }));
  res.json({ users: locations });
});

// Get emergency users with distance from admin location
router.get("/admin/emergency-users", authRequired, requireRole("ADMIN"), async (req, res) => {
  // Use admin's location if available, otherwise use default location
  const adminLocation = req.user.location && req.user.location.latitude && req.user.location.longitude
    ? req.user.location
    : { latitude: 28.6139, longitude: 77.2090 }; // Default to Delhi
  
  const users = await User.find({ 
    role: "USER",
    status: "EMERGENCY"
  }).select("name status location phone");

  const usersWithDistance = users
    .filter((u) => typeof u.location?.latitude === "number" && typeof u.location?.longitude === "number")
    .map((u) => {
      const d = distanceKm(adminLocation.latitude, adminLocation.longitude, u.location.latitude, u.location.longitude);
      return {
        id: u._id,
        name: u.name,
        status: u.status,
        phone: u.phone,
        latitude: u.location.latitude,
        longitude: u.location.longitude,
        distanceKm: Number.isFinite(d) ? Number(d.toFixed(2)) : null
      };
    })
    .filter((u) => u.distanceKm !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json({ users: usersWithDistance });
});

// Get possible risk users with distance from admin location
router.get("/admin/risk-users", authRequired, requireRole("ADMIN"), async (req, res) => {
  // Use admin's location if available, otherwise use default location
  const adminLocation = req.user.location && req.user.location.latitude && req.user.location.longitude
    ? req.user.location
    : { latitude: 28.6139, longitude: 77.2090 }; // Default to Delhi
  
  const users = await User.find({ 
    role: "USER",
    status: "POSSIBLE_RISK"
  }).select("name status location phone");

  const usersWithDistance = users
    .filter((u) => typeof u.location?.latitude === "number" && typeof u.location?.longitude === "number")
    .map((u) => {
      const d = distanceKm(adminLocation.latitude, adminLocation.longitude, u.location.latitude, u.location.longitude);
      return {
        id: u._id,
        name: u.name,
        status: u.status,
        phone: u.phone,
        latitude: u.location.latitude,
        longitude: u.location.longitude,
        distanceKm: Number.isFinite(d) ? Number(d.toFixed(2)) : null
      };
    })
    .filter((u) => u.distanceKm !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json({ users: usersWithDistance });
});

export default router;

import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import { SosAlert } from "../models/SosAlert.js";
import { User } from "../models/User.js";
import { emitEvent } from "../services/realtime.js";

const router = Router();

router.post("/", authRequired, async (req, res) => {
  const alert = await SosAlert.create({
    userId: req.user._id,
    mode: req.body.mode || "URGENT_HELP",
    status: "OPEN",
    latitude: req.user.location?.latitude,
    longitude: req.user.location?.longitude,
    notes: req.body.notes || "SOS triggered",
    userMessage: req.body.userMessage || ""
  });

  emitEvent("sos_created", { id: alert._id, userId: req.user._id, name: req.user.name, mode: alert.mode });
  res.status(201).json({ alert });
});

router.get("/active", authRequired, requireRole("ADMIN"), async (_req, res) => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  // Automatically remove non-resolved alerts older than 10 minutes
  await SosAlert.deleteMany({
    status: { $ne: "RESOLVED" },
    timestamp: { $lt: tenMinutesAgo }
  });

  const alerts = await SosAlert.find({ status: { $ne: "RESOLVED" } })
    .sort({ timestamp: -1 })
    .populate("userId", "name phone location status");
  res.json({ alerts });
});

router.patch("/:id", authRequired, requireRole("ADMIN"), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["OPEN", "EN_ROUTE", "RESOLVED"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const alert = await SosAlert.findByIdAndUpdate(
    id,
    {
      $set: {
        status,
        resolvedAt: status === "RESOLVED" ? new Date() : null
      }
    },
    { new: true }
  ).populate("userId", "name");

  if (!alert) return res.status(404).json({ message: "Alert not found" });

  // When admin resolves, change user status to SAFE
  if (status === "RESOLVED" && alert.userId) {
    await User.findByIdAndUpdate(alert.userId._id, { status: "SAFE" });
  }

  emitEvent("sos_updated", { id: alert._id, status: alert.status, user: alert.userId?.name });
  res.json({ alert });
});

export default router;

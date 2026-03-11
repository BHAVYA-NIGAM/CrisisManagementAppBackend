import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import { TransportRequest } from "../models/TransportRequest.js";
import { emitEvent } from "../services/realtime.js";

const router = Router();

router.get("/emergency-services", authRequired, (_req, res) => {
  res.json({
    services: [
      { name: "Police", number: "112", type: "Government" },
      { name: "Ambulance", number: "108", type: "Government" },
      { name: "Fire Brigade", number: "101", type: "Government" },
      { name: "Women Helpline", number: "1091", type: "Government" },
      { name: "Disaster Management", number: "1078", type: "Government" },
    ],
  });
});

// Citizen creates a verified transport request (e.g. ambulance / fire brigade)
router.post("/transport-requests", authRequired, async (req, res) => {
  const { title, message, type } = req.body || {};

  if (!title || !message) {
    return res.status(400).json({ message: "title and message are required" });
  }

  const doc = await TransportRequest.create({
    userId: req.user._id,
    title,
    message,
    type: type || "AMBULANCE",
    status: "PENDING",
  });

  // Emit real-time event to notify admin
  emitEvent("transport_request_created", {
    requestId: doc._id,
    userId: req.user._id,
    userName: req.user.name,
    title: doc.title,
    type: doc.type,
  });

  res.status(201).json({ request: doc });
});

// Citizen sees their own transport request history (last 24 hours)
router.get("/transport-requests/my-history", authRequired, async (req, res) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const requests = await TransportRequest.find({
    userId: req.user._id,
    createdAt: { $gte: twentyFourHoursAgo },
  }).sort({ createdAt: -1 });

  res.json({ requests });
});

// Admin sees all transport requests (latest 10 from last 24 hours)
router.get(
  "/transport-requests",
  authRequired,
  requireRole("ADMIN"),
  async (_req, res) => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const requests = await TransportRequest.find({
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "name phone location");

    res.json({ requests });
  },
);

// Cleanup job: Delete transport requests older than 24 hours
router.delete(
  "/transport-requests/cleanup",
  authRequired,
  requireRole("ADMIN"),
  async (_req, res) => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await TransportRequest.deleteMany({
      createdAt: { $lt: twentyFourHoursAgo },
    });

    res.json({ deletedCount: result.deletedCount });
  },
);

// Admin accepts or declines a request
router.patch(
  "/transport-requests/:id",
  authRequired,
  requireRole("ADMIN"),
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!["PENDING", "ACCEPTED", "DECLINED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const doc = await TransportRequest.findByIdAndUpdate(
      id,
      { $set: { status, respondedAt: new Date() } },
      { new: true },
    ).populate("userId", "name phone location");

    if (!doc) return res.status(404).json({ message: "Request not found" });

    // Emit real-time event to notify citizen
    emitEvent("transport_request_updated", {
      requestId: doc._id,
      userId: doc.userId._id,
      status: doc.status,
    });

    res.json({ request: doc });
  },
);

export default router;

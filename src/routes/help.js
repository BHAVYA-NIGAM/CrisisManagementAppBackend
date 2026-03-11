import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { HelpOffer } from "../models/HelpOffer.js";
import { User } from "../models/User.js";
import { emitEvent } from "../services/realtime.js";

const router = Router();

// Offer help to another user
router.post("/offer", authRequired, async (req, res) => {
  const { userId, message } = req.body;
  
  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  const targetUser = await User.findById(userId).select("status safetySettings");
  if (!targetUser) {
    return res.status(404).json({ message: "User not found" });
  }
  if (!["EMERGENCY", "POSSIBLE_RISK"].includes(targetUser.status)) {
    return res.status(400).json({ message: "User is not requesting help" });
  }
  if (targetUser.safetySettings?.allowInSafetyCircle === false) {
    return res.status(403).json({ message: "User is not visible in Safety Circle" });
  }
  if (targetUser.safetySettings?.receiveHelpRequests === false) {
    return res.status(403).json({ message: "User has disabled help requests" });
  }

  // Check if already offered help (and not expired)
  const existing = await HelpOffer.findOne({
    helperId: req.user._id,
    userId,
    status: "PENDING",
    expiresAt: { $gt: new Date() }
  });

  if (existing) {
    return res.status(400).json({ message: "You have already offered help to this user" });
  }

  // Expire old offers from this helper to this user
  await HelpOffer.updateMany(
    {
      helperId: req.user._id,
      userId,
      status: "PENDING"
    },
    { status: "EXPIRED" }
  );

  const offer = await HelpOffer.create({
    helperId: req.user._id,
    userId,
    helperName: req.user.name,
    message: message || `${req.user.name} is coming to help you`,
    status: "PENDING",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  });

  // Notify the user who needs help
  emitEvent("help_offered", {
    offerId: offer._id,
    helperId: req.user._id,
    helperName: req.user.name,
    userId,
    message: offer.message
  });

  res.status(201).json({ offer });
});

// Get pending help offers for current user
router.get("/offers/pending", authRequired, async (req, res) => {
  // Expire old offers
  await HelpOffer.updateMany(
    {
      userId: req.user._id,
      status: "PENDING",
      expiresAt: { $lt: new Date() }
    },
    { status: "EXPIRED" }
  );

  const offers = await HelpOffer.find({
    userId: req.user._id,
    status: "PENDING",
    expiresAt: { $gt: new Date() }
  })
    .sort({ created_at: -1 })
    .populate("helperId", "name phone profilePhoto");
  
  res.json({ offers });
});

// Respond to a help offer
router.patch("/offers/:id", authRequired, async (req, res) => {
  const { id } = req.params;
  const { status, changeStatusToSafe } = req.body;

  if (!["ACCEPTED", "DECLINED"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const offer = await HelpOffer.findById(id).populate("helperId", "name");

  if (!offer) {
    return res.status(404).json({ message: "Offer not found" });
  }

  if (offer.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized" });
  }

  offer.status = status;
  await offer.save();

  // If user accepts help and wants to mark themselves safe
  if (status === "ACCEPTED" && changeStatusToSafe) {
    req.user.status = "SAFE";
    await req.user.save();
  }

  // Notify the helper
  emitEvent("help_response", {
    offerId: offer._id,
    helperId: offer.helperId._id,
    status,
    userName: req.user.name
  });

  res.json({ offer });
});

// Check if user has offered help to someone
router.get("/offered/:userId", authRequired, async (req, res) => {
  const offer = await HelpOffer.findOne({
    helperId: req.user._id,
    userId: req.params.userId,
    status: "PENDING",
    expiresAt: { $gt: new Date() }
  });

  res.json({ hasOffered: !!offer, offer });
});

// Cancel help offer
router.delete("/offers/:id", authRequired, async (req, res) => {
  const { id } = req.params;
  const offer = await HelpOffer.findById(id);

  if (!offer) {
    return res.status(404).json({ message: "Offer not found" });
  }

  if (offer.helperId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized" });
  }

  offer.status = "EXPIRED";
  await offer.save();

  res.json({ message: "Offer cancelled" });
});

export default router;

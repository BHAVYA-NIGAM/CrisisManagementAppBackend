import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import { SystemConfig } from "../models/SystemConfig.js";
import { emitEvent } from "../services/realtime.js";

const router = Router();

const getOrCreate = async () => {
  const found = await SystemConfig.findOne({ key: "global" });
  if (found) return found;
  return SystemConfig.create({ key: "global", alertLevel: "SAFE" });
};

router.get("/status", authRequired, async (_req, res) => {
  const conf = await getOrCreate();
  res.json({ status: conf });
});

router.patch("/status", authRequired, requireRole("ADMIN"), async (req, res) => {
  const { alertLevel, incidentType, incidentNote } = req.body;
  if (!["HIGH", "SAFE"].includes(alertLevel)) {
    return res.status(400).json({ message: "Invalid alertLevel" });
  }
  if (
    incidentType &&
    !["NONE", "WAR", "FLOOD", "TSUNAMI", "EARTHQUAKE", "FIRE", "PANDEMIC", "TERROR"].includes(incidentType)
  ) {
    return res.status(400).json({ message: "Invalid incidentType" });
  }
  const conf = await getOrCreate();
  conf.alertLevel = alertLevel;
  if (incidentType) conf.incidentType = incidentType;
  if (typeof incidentNote === "string") conf.incidentNote = incidentNote;
  conf.updatedBy = req.user._id;
  await conf.save();

  emitEvent("alert_level_updated", {
    alertLevel: conf.alertLevel,
    incidentType: conf.incidentType,
    incidentNote: conf.incidentNote,
    at: new Date().toISOString()
  });

  res.json({ status: conf });
});

export default router;

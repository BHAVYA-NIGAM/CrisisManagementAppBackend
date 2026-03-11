import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { EmergencyContact } from "../models/EmergencyContact.js";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  const contacts = await EmergencyContact.find({ userId: req.user._id }).sort({ created_at: -1 });
  res.json({ contacts });
});

router.post("/", authRequired, async (req, res) => {
  const { name, number, relationship } = req.body;
  if (!name || !number) return res.status(400).json({ message: "name and number required" });
  const contact = await EmergencyContact.create({ userId: req.user._id, name, number, relationship });
  res.status(201).json({ contact });
});

router.put("/:id", authRequired, async (req, res) => {
  const { id } = req.params;
  const contact = await EmergencyContact.findOneAndUpdate(
    { _id: id, userId: req.user._id },
    { $set: req.body },
    { new: true }
  );
  if (!contact) return res.status(404).json({ message: "Contact not found" });
  res.json({ contact });
});

router.delete("/:id", authRequired, async (req, res) => {
  const { id } = req.params;
  const deleted = await EmergencyContact.findOneAndDelete({ _id: id, userId: req.user._id });
  if (!deleted) return res.status(404).json({ message: "Contact not found" });
  res.json({ ok: true });
});

export default router;

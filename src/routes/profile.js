import { Router } from "express";
import bcrypt from "bcryptjs";
import { authRequired } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { EmergencyContact } from "../models/EmergencyContact.js";
import { emitEvent } from "../services/realtime.js";

const router = Router();

// Get full user profile with emergency contacts
router.get("/", authRequired, async (req, res) => {
  const contacts = await EmergencyContact.find({ userId: req.user._id });
  res.json({ 
    user: req.user,
    emergencyContacts: contacts
  });
});

// Update user profile (editable fields only)
router.patch("/", authRequired, async (req, res) => {
  const {
    address,
    profilePhoto,
    organizationRole,
    organizationName,
    bloodGroup,
    medicalCondition,
    safetySettings
  } = req.body;

  // Update only editable fields
  if (address) {
    req.user.address = {
      ...req.user.address,
      ...address
    };
  }
  
  if (profilePhoto !== undefined) req.user.profilePhoto = profilePhoto;
  if (organizationRole) req.user.organizationRole = organizationRole;
  if (organizationName !== undefined) req.user.organizationName = organizationName;
  if (bloodGroup !== undefined) req.user.bloodGroup = bloodGroup;
  if (medicalCondition !== undefined) req.user.medicalCondition = medicalCondition;
  
  if (safetySettings) {
    req.user.safetySettings = {
      ...req.user.safetySettings,
      ...safetySettings
    };
  }

  await req.user.save();
  emitEvent("profile_updated", {
    userId: req.user._id,
    safetySettings: req.user.safetySettings,
    profilePhoto: req.user.profilePhoto,
    name: req.user.name,
    organizationRole: req.user.organizationRole,
    organizationName: req.user.organizationName
  });
  res.json({ user: req.user });
});

// Change password
router.post("/change-password", authRequired, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: "Old password and new password are required" });
  }

  // Verify old password
  const isValid = await bcrypt.compare(oldPassword, req.user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  // Hash and update new password
  const passwordHash = await bcrypt.hash(newPassword, 10);
  req.user.passwordHash = passwordHash;
  await req.user.save();

  res.json({ message: "Password changed successfully" });
});

// Complete registration with additional profile data
router.post("/complete-registration", authRequired, async (req, res) => {
  const {
    dateOfBirth,
    aadhaarNumber,
    profilePhoto,
    organizationRole,
    organizationName,
    bloodGroup,
    medicalCondition,
    isTrustedResponder,
    trustedResponderType,
    trustedResponderIdProof,
    trustedResponderDepartment,
    safetySettings,
    permissions
  } = req.body;

  // Update all registration fields
  if (dateOfBirth) req.user.dateOfBirth = new Date(dateOfBirth);
  if (aadhaarNumber) {
    // Hash Aadhaar for security
    const crypto = await import("crypto");
    req.user.aadhaarHash = crypto.createHash("sha256").update(aadhaarNumber).digest("hex");
  }
  if (profilePhoto) req.user.profilePhoto = profilePhoto;
  if (organizationRole) req.user.organizationRole = organizationRole;
  if (organizationName) req.user.organizationName = organizationName;
  if (bloodGroup) req.user.bloodGroup = bloodGroup;
  if (medicalCondition) req.user.medicalCondition = medicalCondition;
  
  if (isTrustedResponder) {
    req.user.isTrustedResponder = true;
    req.user.trustedResponderType = trustedResponderType || "None";
    req.user.trustedResponderIdProof = trustedResponderIdProof;
    req.user.trustedResponderDepartment = trustedResponderDepartment;
    // Will be verified separately
    req.user.trustedResponderVerified = false;
  }

  if (safetySettings) {
    req.user.safetySettings = {
      ...req.user.safetySettings,
      ...safetySettings
    };
  }

  if (permissions) {
    req.user.permissions = {
      ...req.user.permissions,
      ...permissions
    };
  }

  req.user.registrationCompleted = true;
  await req.user.save();

  res.json({ user: req.user });
});

// Simulate trusted responder verification
router.post("/verify-responder", authRequired, async (req, res) => {
  if (!req.user.isTrustedResponder) {
    return res.status(400).json({ message: "User is not registered as trusted responder" });
  }

  // Simulate 10-15 second verification
  await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds

  // Mark as verified
  req.user.trustedResponderVerified = true;
  await req.user.save();

  res.json({ 
    verified: true,
    message: "Trusted responder verification successful",
    user: req.user
  });
});

export default router;

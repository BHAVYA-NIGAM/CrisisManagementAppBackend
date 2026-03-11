import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    phone: { type: String, trim: true, required: false, sparse: true },
    email: { type: String, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
    status: {
      type: String,
      enum: ["SAFE", "EMERGENCY", "POSSIBLE_RISK", "UNKNOWN"],
      default: "UNKNOWN"
    },
    location: {
      latitude: Number,
      longitude: Number,
      updatedAt: Date
    },
    address: {
      fullAddress: String,
      state: String,
      city: String,
      district: String
    },
    // eKYC & Profile Data
    dateOfBirth: Date,
    aadhaarHash: String,
    profilePhoto: String,
    
    // Organization Details
    organizationRole: { type: String, enum: ["Citizen", "Student", "Organization Member"], default: "Citizen" },
    organizationName: String,
    
    // Medical & Safety Info
    bloodGroup: String,
    medicalCondition: String,
    
    // Trusted Responder
    isTrustedResponder: { type: Boolean, default: false },
    trustedResponderType: { type: String, enum: ["Police", "Army", "None"], default: "None" },
    trustedResponderIdProof: String,
    trustedResponderDepartment: String,
    trustedResponderVerified: { type: Boolean, default: false },
    
    // Safety Settings
    safetySettings: {
      allowInSafetyCircle: { type: Boolean, default: true },
      receiveHelpRequests: { type: Boolean, default: true },
      shareLocationInEmergency: { type: Boolean, default: true },
      allowSOSToContacts: { type: Boolean, default: true }
    },
    
    // Permissions
    permissions: {
      locationAccess: { type: String, enum: ["always", "while_using", "denied"], default: "denied" },
      microphoneAccess: { type: Boolean, default: false },
      cameraAccess: { type: Boolean, default: false },
      notificationsEnabled: { type: Boolean, default: false }
    },
    
    riskCountdownEndsAt: Date,
    registrationCompleted: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

userSchema.index({ "location.latitude": 1, "location.longitude": 1 });

export const User = mongoose.model("User", userSchema);

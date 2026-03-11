import mongoose from "mongoose";

const emergencyContactSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    number: { type: String, required: true, trim: true },
    relationship: { type: String, trim: true, default: "Contact" }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export const EmergencyContact = mongoose.model("EmergencyContact", emergencyContactSchema);

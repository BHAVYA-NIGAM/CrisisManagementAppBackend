import mongoose from "mongoose";

const systemConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    alertLevel: { type: String, enum: ["HIGH", "SAFE"], default: "SAFE" },
    incidentType: {
      type: String,
      enum: ["NONE", "WAR", "FLOOD", "TSUNAMI", "EARTHQUAKE", "FIRE", "PANDEMIC", "TERROR"],
      default: "NONE"
    },
    incidentNote: { type: String, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const SystemConfig = mongoose.model("SystemConfig", systemConfigSchema);

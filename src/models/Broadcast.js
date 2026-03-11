import mongoose from "mongoose";

const broadcastSchema = new mongoose.Schema(
  {
    alertType: { type: String, enum: ["Advisory", "Warning", "Emergency", "Danger"], required: true },
    zone: { type: String, required: true },
    targetScope: { type: String, enum: ["Nation", "State", "City", "District"], default: "Nation" },
    targetState: String,
    targetCity: String,
    targetDistrict: String,
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ["info", "warning", "danger", "emergency"], default: "warning" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: { createdAt: "timestamp", updatedAt: false } }
);

export const Broadcast = mongoose.model("Broadcast", broadcastSchema);

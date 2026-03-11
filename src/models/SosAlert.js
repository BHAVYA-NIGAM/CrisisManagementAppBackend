import mongoose from "mongoose";

const sosAlertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["OPEN", "EN_ROUTE", "RESOLVED"], default: "OPEN" },
    mode: { type: String, enum: ["NEED_HELP", "AUTO_RISK_ESCALATION", "URGENT_HELP"], required: true },
    latitude: Number,
    longitude: Number,
    notes: String,
    userMessage: String,
    resolvedAt: Date
  },
  { timestamps: { createdAt: "timestamp", updatedAt: true } }
);

export const SosAlert = mongoose.model("SosAlert", sosAlertSchema);

import mongoose from "mongoose";

const helpOfferSchema = new mongoose.Schema(
  {
    helperId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED"], default: "PENDING" },
    message: String,
    helperName: String,
    expiresAt: Date
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

helpOfferSchema.index({ userId: 1, status: 1 });
helpOfferSchema.index({ helperId: 1 });

export const HelpOffer = mongoose.model("HelpOffer", helpOfferSchema);

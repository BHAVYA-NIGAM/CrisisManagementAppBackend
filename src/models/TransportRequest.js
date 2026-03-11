import mongoose from "mongoose";

const transportRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["AMBULANCE", "FIRE_BRIGADE", "POLICE_ESCORT", "OTHER"],
      default: "AMBULANCE"
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DECLINED"],
      default: "PENDING",
      index: true
    }
  },
  { timestamps: true }
);

export const TransportRequest = mongoose.model("TransportRequest", transportRequestSchema);


import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error("MONGODB_URI is required and must point to MongoDB Atlas.");
}
if (mongoUri.startsWith("mongodb://")) {
  throw new Error("Local MongoDB URIs are not allowed. Use a MongoDB Atlas SRV URI.");
}

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri,
  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientOrigin: process.env.CLIENT_ORIGIN || "*"
};

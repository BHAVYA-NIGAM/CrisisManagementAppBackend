import http from "http";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import contactRoutes from "./routes/contacts.js";
import broadcastRoutes from "./routes/broadcasts.js";
import sosRoutes from "./routes/sos.js";
import mapRoutes from "./routes/map.js";
import servicesRoutes from "./routes/services.js";
import systemRoutes from "./routes/system.js";
import aiRoutes from "./routes/ai.js";
import locationRoutes from "./routes/locations.js";
import helpRoutes from "./routes/help.js";
import profileRoutes from "./routes/profile.js";
import { bindIo } from "./services/realtime.js";

const app = express();
app.use(cors({ origin: config.clientOrigin === "*" ? true : config.clientOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/broadcasts", broadcastRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/help", helpRoutes);
app.use("/api/profile", profileRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
  }
});
bindIo(io);

io.on("connection", (socket) => {
  socket.emit("connected", { id: socket.id, now: new Date().toISOString() });
});

mongoose
  .connect(config.mongoUri)
  .then(() => {
    server.listen(config.port, () => {
      console.log(`API listening on http://localhost:${config.port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed", err);
    process.exit(1);
  });

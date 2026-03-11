import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import { Broadcast } from "../models/Broadcast.js";
import { User } from "../models/User.js";
import { emitEvent } from "../services/realtime.js";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  // Filter broadcasts based on user's location
  const user = await User.findById(req.user._id).select("address role location");
  
  if (user.role === "ADMIN") {
    // Admins see all broadcasts
    const broadcasts = await Broadcast.find().sort({ timestamp: -1 }).limit(50);
    return res.json({ broadcasts });
  }

  const normalize = (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

  // Users see broadcasts relevant to their location
  const broadcasts = await Broadcast.find().sort({ timestamp: -1 }).limit(100);
  
  // Get user's location details from GPS if not in address
  let userLocation = user.address;
  if (!userLocation || !userLocation.state) {
    // Try to get from GPS coordinates using reverse geocoding
    if (user.location?.latitude && user.location?.longitude) {
      try {
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${user.location.latitude}&lon=${user.location.longitude}`;
        const geoRes = await fetch(geoUrl, { headers: { "User-Agent": "crisis-mode-app" } });
        const geoType = geoRes.headers.get("content-type") || "";
        if (!geoRes.ok || !geoType.includes("application/json")) {
          throw new Error("Geocode response is not JSON");
        }
        const geoData = await geoRes.json();
        userLocation = {
          state: geoData.address?.state,
          city: geoData.address?.city || geoData.address?.town || geoData.address?.village,
          district: geoData.address?.state_district
        };
      } catch (err) {
        console.error("Reverse geocoding failed", err);
      }
    }
  }
  
  const normalizedUser = {
    state: normalize(userLocation?.state),
    city: normalize(userLocation?.city),
    district: normalize(userLocation?.district)
  };

  const relevantBroadcasts = broadcasts.filter(broadcast => {
    // Nation-wide broadcasts are shown to everyone
    if (broadcast.targetScope === "Nation" || !broadcast.targetScope) return true;
    
    if (!normalizedUser.state) return false;
    
    // State-level filtering - if no city specified, show to all in state
    if (broadcast.targetScope === "State") {
      return normalizedUser.state === normalize(broadcast.targetState);
    }
    
    // City-level filtering - if no district specified, show to all in city
    if (broadcast.targetScope === "City") {
      if (!broadcast.targetCity) {
        // No specific city, show to all in state
        return normalizedUser.state === normalize(broadcast.targetState);
      }
      return normalizedUser.state === normalize(broadcast.targetState) && 
             normalizedUser.city === normalize(broadcast.targetCity);
    }
    
    // District-level filtering
    if (broadcast.targetScope === "District") {
      if (!broadcast.targetDistrict) {
        // No specific district, show to all in city
        return normalizedUser.state === normalize(broadcast.targetState) && 
               normalizedUser.city === normalize(broadcast.targetCity);
      }
      return normalizedUser.state === normalize(broadcast.targetState) && 
             normalizedUser.city === normalize(broadcast.targetCity) &&
             normalizedUser.district === normalize(broadcast.targetDistrict);
    }
    
    return true;
  }).slice(0, 50);
  
  res.json({ broadcasts: relevantBroadcasts });
});

router.post("/", authRequired, requireRole("ADMIN"), async (req, res) => {
  const { alertType, zone, title, message, severity, targetScope, targetState, targetCity, targetDistrict } = req.body;
  if (!alertType || !zone || !title || !message) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  
  // Map alertType to severity if not provided
  let finalSeverity = severity;
  if (!finalSeverity) {
    if (alertType === "Emergency") finalSeverity = "emergency";
    else if (alertType === "Warning") finalSeverity = "warning";
    else if (alertType === "Advisory") finalSeverity = "info";
    else if (alertType === "Danger") finalSeverity = "danger";
    else finalSeverity = "warning";
  }
  
  const broadcast = await Broadcast.create({
    alertType,
    zone,
    targetScope: targetScope || "Nation",
    targetState: targetState || null,
    targetCity: targetCity || null,
    targetDistrict: targetDistrict || null,
    title,
    message,
    severity: finalSeverity,
    createdBy: req.user._id
  });

  emitEvent("broadcast_created", broadcast);
  res.status(201).json({ broadcast });
});

export default router;

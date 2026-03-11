import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { getAllStates, getCitiesByState, getDistrictsByCity } from "../data/indiaLocations.js";

const router = Router();

// Get all states
router.get("/states", authRequired, async (_req, res) => {
  const states = getAllStates();
  res.json({ states });
});

// Get cities by state
router.get("/cities/:state", authRequired, async (req, res) => {
  const cities = getCitiesByState(req.params.state);
  res.json({ cities });
});

// Get districts by state and city
router.get("/districts/:state/:city", authRequired, async (req, res) => {
  const districts = getDistrictsByCity(req.params.state, req.params.city);
  res.json({ districts });
});

export default router;

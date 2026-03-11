import { Router } from "express";
import { authRequired } from "../middleware/auth.js";

const router = Router();

// Cache for consistent zones per city (based on latitude/longitude grid)
const zoneCache = {
  crime: new Map(),
  crowd: new Map()
};

// Get city grid key from coordinates (round to 2 decimal places for city-level consistency)
const getCityKey = (lat, lng) => {
  return `${Math.round(lat * 100) / 100}_${Math.round(lng * 100) / 100}`;
};

// Generate crime points for a city (with seeded random based on city key)
const generateCrimePoints = (origin, cityKey) => {
  const basePoints = [
    {
      id: "c1",
      offsetLat: 0.012,
      offsetLng: 0.002,
      score: 88,
      label: "🚨 Recent Terror Threat - High harassment risk hotspot",
      description: "URGENT: Recent terror threat reported. Multiple late-night harassment and theft reports in the last week.",
      incidentType: "TERROR_THREAT"
    },
    {
      id: "c2",
      offsetLat: 0.007,
      offsetLng: -0.011,
      score: 71,
      label: "⚠️ Recent Riot - Assault incident area",
      description: "WARNING: Riot activity reported. Police registered serious assault cases here within the last 48 hours.",
      incidentType: "RIOT"
    },
    {
      id: "c3",
      offsetLat: -0.002,
      offsetLng: 0.011,
      score: 52,
      label: "Pickpocketing and phone snatching",
      description: "Reported cases of snatching in crowded hours and at bus stops nearby.",
      incidentType: "THEFT"
    },
    {
      id: "c4",
      offsetLat: -0.009,
      offsetLng: -0.004,
      score: 34,
      label: "Low-level nuisance reports",
      description: "Occasional nuisance and minor disputes; keep basic awareness.",
      incidentType: "MINOR"
    },
    {
      id: "c5",
      offsetLat: 0.015,
      offsetLng: -0.008,
      score: 65,
      label: "Street crime alert",
      description: "Multiple reports of mugging and vehicle theft in this area.",
      incidentType: "THEFT"
    },
    {
      id: "c6",
      offsetLat: -0.013,
      offsetLng: 0.007,
      score: 42,
      label: "Vandalism reports",
      description: "Property damage and vandalism cases reported.",
      incidentType: "MINOR"
    },
    {
      id: "c7",
      offsetLat: 0.003,
      offsetLng: -0.015,
      score: 78,
      label: "🔥 Gang activity zone",
      description: "WARNING: Gang-related incidents and violent confrontations reported.",
      incidentType: "RIOT"
    },
    {
      id: "c8",
      offsetLat: -0.016,
      offsetLng: -0.012,
      score: 29,
      label: "Minor disturbances",
      description: "Occasional noise complaints and minor altercations.",
      incidentType: "MINOR"
    }
  ];

  // Use city key as seed for consistent random selection
  const seed = cityKey.split('_').reduce((acc, val) => acc + parseFloat(val), 0);
  const seededRandom = (index) => {
    const x = Math.sin(seed + index) * 10000;
    return x - Math.floor(x);
  };
  
  // Consistently select 5-8 points based on city
  const numPoints = Math.floor(seededRandom(0) * 4) + 5; // 5-8 points
  const shuffled = basePoints
    .map((point, idx) => ({ point, sort: seededRandom(idx + 1) }))
    .sort((a, b) => a.sort - b.sort)
    .map(item => item.point);
  const selected = shuffled.slice(0, numPoints);

  return selected.map(point => ({
    id: point.id,
    latitude: origin.latitude + point.offsetLat,
    longitude: origin.longitude + point.offsetLng,
    score: point.score,
    label: point.label,
    description: point.description,
    incidentType: point.incidentType
  }));
};

// Get or generate cached crime points for a city
const getCachedCrimePoints = (origin) => {
  const cityKey = getCityKey(origin.latitude, origin.longitude);
  
  if (!zoneCache.crime.has(cityKey)) {
    zoneCache.crime.set(cityKey, generateCrimePoints(origin, cityKey));
  }
  
  return zoneCache.crime.get(cityKey);
};

const crimePoints = [
  {
    id: "c1",
    latitude: 26.462,
    longitude: 80.332,
    score: 88,
    label: "🚨 Recent Terror Threat - High harassment risk hotspot",
    description: "URGENT: Recent terror threat reported. Multiple late-night harassment and theft reports in the last week.",
    incidentType: "TERROR_THREAT"
  },
  {
    id: "c2",
    latitude: 26.457,
    longitude: 80.319,
    score: 71,
    label: "⚠️ Recent Riot - Assault incident area",
    description: "WARNING: Riot activity reported. Police registered serious assault cases here within the last 48 hours.",
    incidentType: "RIOT"
  },
  {
    id: "c3",
    latitude: 26.448,
    longitude: 80.341,
    score: 52,
    label: "Pickpocketing and phone snatching",
    description: "Reported cases of snatching in crowded hours and at bus stops nearby.",
    incidentType: "THEFT"
  },
  {
    id: "c4",
    latitude: 26.441,
    longitude: 80.326,
    score: 34,
    label: "Low-level nuisance reports",
    description: "Occasional nuisance and minor disputes; keep basic awareness.",
    incidentType: "MINOR"
  }
];

// Generate crowd density points for a city (with seeded random based on city key)
const generateCrowdPoints = (origin, cityKey) => {
  const basePoints = [
    {
      id: "d1",
      offsetLat: 0.016,
      offsetLng: 0.013,
      score: 76,
      label: "Very dense crowd",
      description: "Market area with heavy footfall and traffic congestion."
    },
    {
      id: "d2",
      offsetLat: 0.001,
      offsetLng: 0.021,
      score: 63,
      label: "Busy junction / bus hub",
      description: "Continuous inflow of buses and autos; expect slower movement."
    },
    {
      id: "d3",
      offsetLat: -0.005,
      offsetLng: -0.016,
      score: 47,
      label: "Moderate gathering",
      description: "Shops and local eateries; moderate crowd during peak hours."
    },
    {
      id: "d4",
      offsetLat: -0.012,
      offsetLng: 0.006,
      score: 21,
      label: "Light crowd",
      description: "Residential stretch with light pedestrian movement."
    },
    {
      id: "d5",
      offsetLat: 0.008,
      offsetLng: -0.009,
      score: 82,
      label: "Major shopping district",
      description: "Extremely crowded shopping area, expect long wait times."
    },
    {
      id: "d6",
      offsetLat: -0.018,
      offsetLng: 0.015,
      score: 55,
      label: "Religious gathering spot",
      description: "Temple/mosque area with periodic heavy crowd during prayer times."
    },
    {
      id: "d7",
      offsetLat: 0.011,
      offsetLng: 0.018,
      score: 38,
      label: "Park and recreation",
      description: "Public park with moderate visitors during evenings."
    },
    {
      id: "d8",
      offsetLat: -0.007,
      offsetLng: -0.020,
      score: 14,
      label: "Quiet residential zone",
      description: "Low traffic residential area with minimal crowd."
    }
  ];

  // Use city key as seed for consistent random selection
  const seed = cityKey.split('_').reduce((acc, val) => acc + parseFloat(val), 0);
  const seededRandom = (index) => {
    const x = Math.sin(seed + index + 100) * 10000; // +100 to differ from crime
    return x - Math.floor(x);
  };
  
  // Consistently select 5-8 points based on city
  const numPoints = Math.floor(seededRandom(0) * 4) + 5; // 5-8 points
  const shuffled = basePoints
    .map((point, idx) => ({ point, sort: seededRandom(idx + 1) }))
    .sort((a, b) => a.sort - b.sort)
    .map(item => item.point);
  const selected = shuffled.slice(0, numPoints);

  return selected.map(point => ({
    id: point.id,
    latitude: origin.latitude + point.offsetLat,
    longitude: origin.longitude + point.offsetLng,
    score: point.score,
    label: point.label,
    description: point.description
  }));
};

// Get or generate cached crowd points for a city
const getCachedCrowdPoints = (origin) => {
  const cityKey = getCityKey(origin.latitude, origin.longitude);
  
  if (!zoneCache.crowd.has(cityKey)) {
    zoneCache.crowd.set(cityKey, generateCrowdPoints(origin, cityKey));
  }
  
  return zoneCache.crowd.get(cityKey);
};

const crowdPoints = [
  {
    id: "d1",
    latitude: 26.466,
    longitude: 80.343,
    score: 76,
    label: "Very dense crowd",
    description: "Market area with heavy footfall and traffic congestion."
  },
  {
    id: "d2",
    latitude: 26.451,
    longitude: 80.351,
    score: 63,
    label: "Busy junction / bus hub",
    description: "Continuous inflow of buses and autos; expect slower movement."
  },
  {
    id: "d3",
    latitude: 26.445,
    longitude: 80.314,
    score: 47,
    label: "Moderate gathering",
    description: "Shops and local eateries; moderate crowd during peak hours."
  },
  {
    id: "d4",
    latitude: 26.438,
    longitude: 80.336,
    score: 21,
    label: "Light crowd",
    description: "Residential stretch with light pedestrian movement."
  }
];

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const haversineKm = (a, b) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const q = s1 * s1 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * s2 * s2;
  return 2 * R * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
};

const scoreRouteRisk = (coords) => {
  if (!coords?.length) return 999;
  const riskAnchors = [...crimePoints, ...crowdPoints];
  let risk = 0;
  for (let i = 0; i < coords.length; i += 5) {
    const p = coords[i];
    for (const anchor of riskAnchors) {
      const d = Math.max(haversineKm(p, anchor), 0.12);
      risk += anchor.score / d;
    }
  }
  return risk / Math.max(coords.length / 5, 1);
};

const colorForRank = (rank) => {
  if (rank === 0) return { color: "#22c55e", risk: "LOW" };
  if (rank === 1) return { color: "#f59e0b", risk: "MODERATE" };
  return { color: "#ef4444", risk: "HIGH" };
};

const fallbackRoutes = (origin, destination) => {
  const direct = [
    origin,
    {
      latitude: (origin.latitude + destination.latitude) / 2 + 0.001,
      longitude: (origin.longitude + destination.longitude) / 2 - 0.001
    },
    destination
  ];
  const safeDetour = [
    origin,
    {
      latitude: (origin.latitude + destination.latitude) / 2 + 0.004,
      longitude: (origin.longitude + destination.longitude) / 2 - 0.004
    },
    destination
  ];
  return [safeDetour, direct];
};

const findNearbyDestination = async (origin, type) => {
  const amenity = type === "police" ? "police" : "hospital";
  const query = `[out:json][timeout:15];(node(around:7000,${origin.latitude},${origin.longitude})[amenity=${amenity}];way(around:7000,${origin.latitude},${origin.longitude})[amenity=${amenity}];relation(around:7000,${origin.latitude},${origin.longitude})[amenity=${amenity}];);out center 10;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: query
  });

  if (!response.ok) return null;
  const data = await response.json();
  const elements = data?.elements || [];
  if (!elements.length) return null;

  const candidates = elements
    .map((el) => {
      const latitude = el.lat ?? el.center?.lat;
      const longitude = el.lon ?? el.center?.lon;
      if (typeof latitude !== "number" || typeof longitude !== "number") return null;
      return {
        latitude,
        longitude,
        name: el.tags?.name || `${amenity} destination`
      };
    })
    .filter(Boolean)
    .sort((a, b) => haversineKm(origin, a) - haversineKm(origin, b));

  return candidates[0] || null;
};

const osrmRoutes = async (origin, destination) => {
  const from = `${origin.longitude},${origin.latitude}`;
  const to = `${destination.longitude},${destination.latitude}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${from};${to}?alternatives=true&geometries=geojson&overview=full`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  const routes = data?.routes || [];
  return routes
    .map((r) =>
      (r.geometry?.coordinates || []).map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng
      }))
    )
    .filter((coords) => coords.length > 1);
};

router.get("/layers", authRequired, async (req, res) => {
  const type = req.query.type || "crime";
  const origin = {
    latitude: toNum(req.query.originLat) ?? req.user.location?.latitude ?? 26.45,
    longitude: toNum(req.query.originLng) ?? req.user.location?.longitude ?? 80.33
  };

  if (type === "crime") {
    const cachedCrimePoints = getCachedCrimePoints(origin);
    return res.json({
      type,
      origin,
      points: cachedCrimePoints.map((p) => ({
        ...p,
        level: p.score > 70 ? "HIGH" : p.score > 40 ? "MODERATE" : "LOW"
      }))
    });
  }

  if (type === "crowd") {
    const cachedCrowdPoints = getCachedCrowdPoints(origin);
    return res.json({
      type,
      origin,
      points: cachedCrowdPoints.map((p) => ({
        ...p,
        level: p.score > 70 ? "HIGH" : p.score > 40 ? "MODERATE" : "LOW"
      }))
    });
  }

  const destinationType = req.query.destinationType === "police" ? "police" : "hospital";

  try {
    const destination = (await findNearbyDestination(origin, destinationType)) || {
      latitude: origin.latitude + 0.01,
      longitude: origin.longitude + 0.012,
      name: destinationType === "police" ? "Nearby police station" : "Nearby hospital"
    };

    let alternatives = await osrmRoutes(origin, destination);
    if (!alternatives.length) alternatives = fallbackRoutes(origin, destination);

    const ranked = alternatives
      .map((coords) => ({ coords, score: scoreRouteRisk(coords) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 2)
      .map((route, idx) => {
        const tone = idx === 0 ? { color: "#22c55e", risk: "LOW" } : { color: "#f59e0b", risk: "MODERATE" };
        return {
          id: idx === 0 ? "safe-route" : "moderate-route",
          color: tone.color,
          risk: tone.risk,
          score: Number(route.score.toFixed(2)),
          coords: route.coords
        };
      });

    return res.json({
      type: "route",
      origin,
      destinationType,
      destination,
      routes: ranked
    });
  } catch {
    return res.json({
      type: "route",
      origin,
      destinationType,
      destination: null,
      routes: []
    });
  }
});

export default router;

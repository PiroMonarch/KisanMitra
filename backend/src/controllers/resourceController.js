const Resource = require("../models/Resource");
const User = require("../models/User");

const haversine = (aLat, aLng, bLat, bLng) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const rLat1 = toRad(aLat);
  const rLat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

const getUserRole = async (userId) => {
  if (!userId) return null;
  const user = await User.findById(userId).select("role");
  return user?.role || null;
};

exports.createResource = async (req, res) => {
  try {
    const role = await getUserRole(req.user?.id);
    if (role !== "farmer") {
      return res.status(403).json({ message: "Only farmers can list resources" });
    }

    const enforcedVisibility =
      req.body?.category === "Tools" ? "farmers" : req.body?.visibility;
    const payload = {
      ...req.body,
      visibility: enforcedVisibility || "all",
      ownerId: req.user.id,
    };

    const resource = await Resource.create(payload);
    res.status(201).json({ resource });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getNearbyResources = async (req, res) => {
  try {
    const { lat, lng, type, category } = req.query;
    const role = await getUserRole(req.user?.id);
    const visibilityFilter =
      role === "farmer" ? { $in: ["all", "farmers"] } : { $in: ["all"] };
    const resources = await Resource.find({
      visibility: visibilityFilter,
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
    });

    if (lat && lng) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      const enriched = resources.map((resource) => {
        const loc = resource.location || {};
        const distanceKm = loc.lat && loc.lng
          ? haversine(latNum, lngNum, loc.lat, loc.lng)
          : null;
        return { ...resource.toObject(), distanceKm };
      });
      enriched.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
      return res.json({ resources: enriched });
    }

    res.json({ resources });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

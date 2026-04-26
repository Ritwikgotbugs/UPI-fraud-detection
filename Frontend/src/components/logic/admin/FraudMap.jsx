import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function FraudMap({ points = [] }) {
  const ref = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = L.map(ref.current, { scrollWheelZoom: true }).setView([22.5, 78.9], 5);
    mapRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 18,
    }).addTo(map);

    // Build heatmap data: [lat, lng, intensity]
    const heatData = points
      .filter((p) => p.lat && p.lng)
      .map((p) => [p.lat, p.lng, (p.riskScore || 0) / 100]);

    if (heatData.length) {
      L.heatLayer(heatData, {
        radius: 35,
        blur: 25,
        maxZoom: 10,
        max: 1.0,
        minOpacity: 0.4,
        gradient: {
          0.0: "#22c55e",
          0.3: "#eab308",
          0.6: "#f97316",
          0.8: "#ef4444",
          1.0: "#dc2626",
        },
      }).addTo(map);
    }

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [points]);

  return <div ref={ref} className="w-full h-[500px] rounded-xl overflow-hidden border border-slate-200" />;
}

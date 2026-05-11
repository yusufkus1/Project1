import { useEffect, useState } from "react";
import { format } from "date-fns";
import { MapPin } from "lucide-react";

interface Weather {
  temp: number;
  feelsLike: number;
  sunrise: string;
  sunset: string;
  city?: string;
}

export function WeatherWidget() {
  const [data, setData] = useState<Weather | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        try {
          const [wRes, gRes] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
              `&current=temperature_2m,apparent_temperature&daily=sunrise,sunset` +
              `&timezone=auto&forecast_days=1`
            ),
            fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
            ),
          ]);
          const w = await wRes.json();
          const g = await gRes.json();

          setData({
            temp: Math.round(w.current.temperature_2m),
            feelsLike: Math.round(w.current.apparent_temperature),
            sunrise: w.daily.sunrise[0] as string,
            sunset: w.daily.sunset[0] as string,
            city: g.address?.city || g.address?.town || g.address?.village,
          });
        } catch { /* silent */ }
      },
      () => { /* permission denied — hide widget */ },
      { timeout: 6000 }
    );
  }, []);

  if (!data) return null;

  const sunriseTime = format(new Date(data.sunrise), "HH:mm");
  const sunsetTime  = format(new Date(data.sunset),  "HH:mm");

  return (
    <div style={{
      display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.875rem",
      fontSize: "0.8125rem", color: "#94a3b8", marginTop: "0.375rem",
    }}>
      {data.city && (
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <MapPin size={12} />
          {data.city}
        </span>
      )}

      <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <span style={{ fontSize: "0.9rem" }}>🌡️</span>
        <span className="text-gray-600 dark:text-gray-300" style={{ fontWeight: 600 }}>
          {data.temp}°C
        </span>
        <span style={{ color: "#cbd5e1" }}>/ hissedilen {data.feelsLike}°C</span>
      </span>

      <span style={{ color: "#e2e8f0", userSelect: "none" }}>·</span>

      <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <span style={{ fontSize: "0.9rem" }}>🌅</span>
        <span>{sunriseTime}</span>
      </span>

      <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <span style={{ fontSize: "0.9rem" }}>🌇</span>
        <span>{sunsetTime}</span>
      </span>
    </div>
  );
}

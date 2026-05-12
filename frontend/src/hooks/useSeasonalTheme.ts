export type Season = "spring" | "summer" | "autumn" | "winter";

interface SeasonalTheme {
  season: Season;
  emoji: string;
  greeting: string;
  accent: string;
  tip: string;
}

export function useSeasonalTheme(): SeasonalTheme {
  const month = new Date().getMonth() + 1; // 1-12

  if (month >= 3 && month <= 5) {
    return {
      season: "spring",
      emoji: "🌱",
      greeting: "Spring is here — fresh starts!",
      accent: "#10b981",
      tip: "Spring energy: great time to start new habits.",
    };
  } else if (month >= 6 && month <= 8) {
    return {
      season: "summer",
      emoji: "☀️",
      greeting: "Summer vibes — stay hydrated!",
      accent: "#f59e0b",
      tip: "Beat the heat: tackle hard tasks in the morning.",
    };
  } else if (month >= 9 && month <= 11) {
    return {
      season: "autumn",
      emoji: "🍂",
      greeting: "Autumn — time to harvest results.",
      accent: "#fb923c",
      tip: "Autumn focus: wrap up projects before year-end.",
    };
  } else {
    return {
      season: "winter",
      emoji: "❄️",
      greeting: "Winter — reflect and recharge.",
      accent: "#3b82f6",
      tip: "Winter mode: deep work sessions suit the season.",
    };
  }
}

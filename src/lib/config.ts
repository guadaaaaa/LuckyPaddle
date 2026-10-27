export const BRAND = "Lucky Paddle";
export const TAGLINE = "One private court. Four-leaf luck.";
export const COURTS = [{ id: 1, name: "Private Court" }];
export const courtName = (id: number) => COURTS.find((c) => c.id === id)?.name ?? `Court ${id}`;
export const OPEN_HOUR = 8; // 8:00 AM
export const CLOSE_HOUR = 25; // 1:00 AM next day (last booking can go to 1:00 AM)
export const PRICE_PER_HOUR = 500; // PHP
export const HOLD_MINUTES = 10;

/** Maximum block hours a player can book at once */
export const MAX_DURATION = 18;

/**
 * Photos. Only the hero is a verified free Unsplash photo (Aleksander Saks, Unsplash License).
 * Add more by pasting any image URL; empty strings show a green placeholder.
 */
export const IMAGES = {
  hero: "https://unsplash.com/photos/lqKXSNPb8D0/download?force=true&w=1600",
  players: "",
  paddles: "",
  balls: "",
};

export const hourLabel = (h: number) => {
  if (h >= 24) return `${h - 24}:00 AM`;
  if (h === 12) return "12:00 PM";
  const s = h % 12 === 0 ? 12 : h % 12;
  return `${s}:00 ${h < 12 ? "AM" : "PM"}`;
};
export const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

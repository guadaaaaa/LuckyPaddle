export const BRAND = "Lucky Paddle";
export const TAGLINE = "One private court. Four-leaf luck.";
export const COURTS = [{ id: 1, name: "Private Court" }];
export const courtName = (id: number) => COURTS.find((c) => c.id === id)?.name ?? `Court ${id}`;
export const OPEN_HOUR = 6;
export const CLOSE_HOUR = 22; // last booking starts at 21:00
export const PRICE_PER_HOUR = 400; // PHP
export const HOLD_MINUTES = 10;

/** Maximum block hours a player can book at once */
export const MAX_DURATION = 2;

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
  const s = h % 12 === 0 ? 12 : h % 12;
  return `${s}:00 ${h < 12 ? "AM" : "PM"}`;
};
export const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

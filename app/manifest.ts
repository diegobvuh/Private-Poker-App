import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "House Rules Private Poker Club",
    short_name: "House Rules",
    description: "Private home-game companion and practice tables.",
    start_url: "/",
    display: "standalone",
    background_color: "#07110e",
    theme_color: "#07110e",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}

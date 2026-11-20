import type { MetadataRoute } from "next";

/** Lets people install Workboard on their phone or desktop like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Workboard",
    short_name: "Workboard",
    description: "Tasks, projects and client approvals for the team.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f4f0",
    theme_color: "#1f6f5c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My tasks", url: "/my" },
      { name: "Projects", url: "/projects" },
    ],
  };
}

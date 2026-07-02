import type { MetadataRoute } from "next";

const SITE = "https://picklevision-clean.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now },
    { url: `${SITE}/analysis`, lastModified: now },
    { url: `${SITE}/login`, lastModified: now },
  ];
}

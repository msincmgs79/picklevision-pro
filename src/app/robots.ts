import type { MetadataRoute } from "next";

const SITE = "https://picklevision-clean.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/matches/"], // private user pages + endpoints
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}

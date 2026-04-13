import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
 experimental: {
  mcpServer: true,
 },
 images: {
  remotePatterns: [
   {
    protocol: "https",
    hostname: "images.unsplash.com",
   },
   {
    protocol: "https",
    hostname: "i.pravatar.cc",
   },
   {
    protocol: "https",
    hostname: "raw.githubusercontent.com",
   },
   {
    protocol: "https",
    hostname: "wqvrsvscfsqnezlabmvb.supabase.co",
   },
  ],
 },
};

export default withNextIntl(nextConfig);

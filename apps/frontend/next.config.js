/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  transpilePackages: ['@hotel-growth-os/shared'],
};
module.exports = nextConfig;

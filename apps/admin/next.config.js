/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'localhost',
      's3.amazonaws.com',
      'res.cloudinary.com',          // Cloudinary (production)
      'ammart-backend.onrender.com', // Render backend
      'placeholder.ammart.com',
    ],
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3001/api/v1',
  },
};

module.exports = nextConfig;

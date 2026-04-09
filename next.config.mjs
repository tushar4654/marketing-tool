/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'apify-client',
    'proxy-agent',
    '@libsql/client',
    'libsql',
    '@prisma/adapter-libsql',
  ],
};

export default nextConfig;

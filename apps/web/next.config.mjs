/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ["@dnd/shared"],
  experimental: {
    serverComponentsExternalPackages: ["@node-rs/argon2"],
  },
};

export default config;

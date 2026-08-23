/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3', 'nodemailer', 'web-push']
}

module.exports = nextConfig

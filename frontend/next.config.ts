import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS || false;

let basePath = '';

if (isGithubActions && process.env.GITHUB_REPOSITORY) {
  const repo = process.env.GITHUB_REPOSITORY.replace(/.*?\//, '');
  basePath = `/${repo}`;
}

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "export",
  basePath: basePath,
  assetPrefix: basePath,
};

export default nextConfig;

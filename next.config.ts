import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Prevent `next dev` from auto-generating AGENTS.md/CLAUDE.md at the repo
  // root (Next.js's agent-rules codegen). See config-shared.d.ts `agentRules`.
  agentRules: false,
};

export default nextConfig;

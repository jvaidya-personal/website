import { json, repoOf, branchOf } from '../../_lib/github.js';
export const onRequestGet = ({ data, env }) => json({ email: data.email, repo: repoOf(env), branch: branchOf(env), tokenConfigured: !!env.GITHUB_TOKEN });

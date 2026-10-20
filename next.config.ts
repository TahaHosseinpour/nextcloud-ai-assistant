import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // LangChain/LangGraph run only on the server (Node runtime)
    serverExternalPackages: ['langchain', '@langchain/core', '@langchain/langgraph', '@langchain/openai'],
};

export default nextConfig;

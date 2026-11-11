FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node server.js integrations.js mcp.js telegram.js ./
COPY --chown=node:node core ./core
COPY --chown=node:node modules ./modules
COPY --chown=node:node config ./config
COPY --chown=node:node agent-skills ./agent-skills
COPY --chown=node:node academy ./academy
COPY --chown=node:node extensions ./extensions
COPY --chown=node:node tools ./tools
COPY --chown=node:node models ./models
COPY --chown=node:node docs ./docs
COPY --chown=node:node references ./references
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node public ./public
COPY --chown=node:node tests ./tests
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node","server.js"]

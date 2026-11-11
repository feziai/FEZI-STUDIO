FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV=production PORT=10000 HOST=0.0.0.0
USER node
EXPOSE 10000
CMD ["node","src/server.mjs"]

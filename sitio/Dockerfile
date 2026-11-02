# Sitio público (SvelteKit con adapter-node). Lee la base SQLite indicada en OBSERVATORIO_DB.
FROM node:22-alpine AS compilacion
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install -g npm@11.19.0 && npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=compilacion /app/build ./build
COPY --from=compilacion /app/package.json ./
ENV NODE_ENV=production PORT=3000 OBSERVATORIO_DB=/publico/observatorio.db
USER node
EXPOSE 3000
CMD ["node", "--disable-warning=ExperimentalWarning", "build"]

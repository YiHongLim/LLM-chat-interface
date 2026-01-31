# Build stage
FROM node:20-slim AS build
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm ci --include=optional || npm install --include=optional

RUN npm rebuild @tailwindcss/oxide lightningcss || true

COPY . .
RUN npm run build

# Runtime stage
FROM node:20-slim AS frontend
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]

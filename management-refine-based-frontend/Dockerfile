# This Dockerfile builds the Refine (Vite) app and serves the static files
# with the `serve` package, including SPA fallback for client-side routes.
FROM node:20-alpine AS deps
WORKDIR /app
COPY .npmrc package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
# Vite bakes VITE_* variables in at build time, so pass them as build args:
# docker build --build-arg VITE_BACKEND_BASE_URL=http://localhost:4000 .
ARG VITE_BACKEND_BASE_URL=http://localhost:4000
ARG VITE_CLOUDINARY_CLOUD_NAME=
ARG VITE_CLOUDINARY_UPLOAD_PRESET=
ENV VITE_BACKEND_BASE_URL=$VITE_BACKEND_BASE_URL \
    VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME \
    VITE_CLOUDINARY_UPLOAD_PRESET=$VITE_CLOUDINARY_UPLOAD_PRESET

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

RUN npm install -g serve@14 && npm cache clean --force

COPY --from=builder /app/dist ./dist

# run as the non-root "node" user that ships with the base image
USER node

EXPOSE 3000

# "-s" enables single-page mode so routes like /login work on refresh
CMD ["serve", "-s", "dist", "-l", "3000"]

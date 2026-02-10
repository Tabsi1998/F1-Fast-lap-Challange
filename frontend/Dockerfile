# Stage 1: Build React App
FROM node:20-alpine AS builder

WORKDIR /app

# Copy all package files
COPY package.json ./
COPY yarn.lock* ./
COPY craco.config.js* ./
COPY tailwind.config.js* ./
COPY postcss.config.js* ./
COPY jsconfig.json* ./

# Install dependencies with yarn
RUN yarn install --frozen-lockfile || yarn install

# Copy source files
COPY public/ ./public/
COPY src/ ./src/

# Set backend URL for build (leer = nginx proxy verwendet /api)
ENV REACT_APP_BACKEND_URL=
ENV DISABLE_ESLINT_PLUGIN=true
ENV CI=false

# Build
RUN yarn build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

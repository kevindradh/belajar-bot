# Tahap 1: Build
FROM node:22-alpine AS builder

# Aktifkan pnpm via corepack
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate

# Set working directory
WORKDIR /app

# Copy file package management
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./

# Install semua dependencies (termasuk devDependencies untuk keperluan build)
RUN pnpm install --frozen-lockfile

# Copy seluruh source code
COPY . .

# Build kode TypeScript ke JavaScript (masuk ke folder dist/)
RUN pnpm build

# Tahap 2: Production
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@11.0.8 --activate

WORKDIR /app

# Copy file package management
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./

# Install HANYA dependencies production agar image lebih ringan
RUN pnpm install --prod --frozen-lockfile

# Copy hasil build dari tahap 1
COPY --from=builder /app/dist ./dist

# (Opsional) Copy folder scripts dan data jika sewaktu-waktu ingin menjalankan pnpm seed dari dalam container
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/data ./data

# Set environment ke production
ENV NODE_ENV=production

# Jalankan bot
CMD ["pnpm", "start"]

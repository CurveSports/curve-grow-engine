# Sharp needs glibc + libvips; node:20-slim works well
FROM node:20-slim

WORKDIR /app

# Install fonts for text rendering (sharp uses librsvg for SVG text)
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-inter \
    fonts-dejavu-core \
    fonts-liberation \
    fontconfig \
  && rm -rf /var/lib/apt/lists/* \
  && fc-cache -f

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "src/server.js"]

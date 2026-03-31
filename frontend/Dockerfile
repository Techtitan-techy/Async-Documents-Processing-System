FROM node:20-alpine

WORKDIR /app

# Enable legacy peer deps just in case
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps || echo "Skipped npm install because package.json might be missing"

COPY . .

# Next.js dev server port
EXPOSE 3000

CMD ["sh", "-c", "npm install && npm run dev"]

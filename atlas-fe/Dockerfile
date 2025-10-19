# Build stage
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage  
FROM nginx:alpine

# ÖNEMLİ: browser klasörünü kopyala (Angular 17+ için)
COPY --from=build /app/dist/atlas-fe/browser /usr/share/nginx/html

# Nginx config (Angular routing için)
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

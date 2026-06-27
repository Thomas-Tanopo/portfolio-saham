FROM node:22-alpine AS build
ENV VITE_API_URL=https://app-portfolio-backend-65pnpg-a8cbf7-212-85-26-253.sslip.io/api
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

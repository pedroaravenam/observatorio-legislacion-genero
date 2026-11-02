FROM node:24-alpine AS compilacion
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --configuration production

FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /web/dist/web/browser /usr/share/nginx/html
EXPOSE 80

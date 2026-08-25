FROM node:20-alpine

RUN apk add --no-cache ffmpeg fontconfig ttf-dejavu && fc-cache -f

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./

EXPOSE 3000

CMD ["node", "server.js"]

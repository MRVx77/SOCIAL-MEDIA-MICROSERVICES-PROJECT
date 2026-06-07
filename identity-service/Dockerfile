# use officail nodejs 18 image with alpine linux as the base image
FROM node:20-alpine

WORKDIR /use/src/app

COPY package*.json ./

RUN npm ci --only=proudcution

COPY . .

EXPOSE 3001

CMD [ "node", "src/server.js" ]

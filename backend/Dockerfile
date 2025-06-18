FROM node:18-alpine

WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY backend/package*.json ./
RUN npm install --only=production

# Bundle app source
COPY backend/ ./

EXPOSE 3001
CMD [ "node", "server.js" ]

FROM node:16-slim as build

# Create app directory
WORKDIR /app
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY src/ ./src
COPY routines/ ./routines
# RUN npm install
# If you are building your code for production
RUN npm ci; \
    NODE_ENV=production npm run build-frontend-assets;

FROM node:16-slim as final

ENV NODE_ENV production
EXPOSE 8080
WORKDIR /app
CMD [ "npm", "start" ]

COPY package*.json ./
COPY src/ ./src
COPY routines/ ./routines
COPY configs.json .
COPY --from=build /app/node_modules/ node_modules/
COPY --from=build /app/src/public/dist src/public/dist

RUN npm prune --omit=dev
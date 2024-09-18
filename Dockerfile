FROM node:slim
WORKDIR /workdir
COPY package.json package-lock.json tailwind.config.js ./
RUN npm ci
COPY tailwind.config.js ./
COPY ./views ./views
COPY app.js database.js ./
CMD ["node", "app.js"]

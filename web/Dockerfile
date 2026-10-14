FROM node:26
RUN mkdir -p /app
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 8080
ENTRYPOINT ["npm", "start"]

FROM node:12
RUN mkdir -p /app
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 8080
ENTRYPOINT ["npm", "start"]

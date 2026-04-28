FROM nginx:alpine
COPY /dist/moup-ui/browser /usr/share/nginx/html
COPY /nginx.conf /etc/nginx/nginx.conf
# Expose port 80 and start Nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

#ng build --configuration=production
#docker build -t moup-ui .
#docker kill moup-ui
#docker rm moup-ui
#docker run -d --name moup-ui -p 80:80 --restart always moup-ui

#ng build --configuration=production && docker build -t moup-ui . && docker kill moup-ui && docker rm moup-ui && docker run -d --name moup-ui -p 80:80 --restart always moup-ui

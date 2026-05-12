FROM nginx:alpine
COPY /dist/moup-ui/browser /usr/share/nginx/html
COPY /nginx.conf /etc/nginx/nginx.conf
COPY /fullchain1.pem /usr/share/nginx
COPY /privkey1.pem /usr/share/nginx
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]

#ng build --configuration=production
#cp /etc/letsencrypt/archive/moup.io/fullchain1.pem ~/Code/moup-ui
#cp /etc/letsencrypt/archive/moup.io/privkey1.pem ~/Code/moup-ui
#docker build -t moup-ui .
#rm ~/Code/moup-ui/fullchain1.pem
#rm ~/Code/moup-ui/privkey1.pem
#docker kill moup-ui
#docker rm moup-ui
#docker run -d --name moup-ui -p 80:80 -p 443:443 --restart always moup-ui

#ng build --configuration=production && cp /etc/letsencrypt/archive/moup.io/fullchain1.pem ~/Code/moup-ui && cp /etc/letsencrypt/archive/moup.io/privkey1.pem ~/Code/moup-ui && docker build -t moup-ui . && rm ~/Code/moup-ui/fullchain1.pem && rm ~/Code/moup-ui/privkey1.pem && docker kill moup-ui && docker rm moup-ui && docker run -d --name moup-ui -p 80:80 -p 443:443 --restart always moup-ui

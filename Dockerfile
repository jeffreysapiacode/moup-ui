FROM nginx:alpine
COPY /dist/moup-ui/browser /usr/share/nginx/html
COPY /nginx.conf /etc/nginx/nginx.conf
COPY /fullchain1.pem /usr/share/nginx
COPY /privkey1.pem /usr/share/nginx
EXPOSE 444
CMD ["nginx", "-g", "daemon off;"]

# Build and Deploy to AWS EC2
# ON LOCAL INSTANCE
# ng build --configuration=production
# cp /etc/letsencrypt/archive/moup.io/fullchain1.pem ~/Code/moup-ui
# cp /etc/letsencrypt/archive/moup.io/privkey1.pem ~/Code/moup-ui
# docker build --platform linux/amd64,linux/arm64 -t moup-ui .
# rm ~/Code/moup-ui/fullchain1.pem
# rm ~/Code/moup-ui/privkey1.pem
# docker tag moup-ui:latest registry.moup.io/moup-ui:latest
# docker push registry.moup.io/moup-ui:latest

# ON REMOTE INSTANCE
# ssh -i "~/moup-macbook-air.pem" ec2-user@3.147.184.206 sudo docker pull registry.moup.io/moup-ui:latest
# ssh -i "~/moup-macbook-air.pem" ec2-user@3.147.184.206 sudo docker kill moup-ui
# ssh -i "~/moup-macbook-air.pem" ec2-user@3.147.184.206 sudo docker rm moup-ui
# ssh -i "~/moup-macbook-air.pem" ec2-user@3.147.184.206 sudo docker run -d --name moup-ui -p 80:80 -p 443:443 --restart always registry.moup.io/moup-ui:latest

# ng build --configuration=production && cp /etc/letsencrypt/archive/moup.io/fullchain1.pem ~/Code/moup-ui && cp /etc/letsencrypt/archive/moup.io/privkey1.pem ~/Code/moup-ui && docker build --platform linux/amd64,linux/arm64 -t moup-ui . && rm ~/Code/moup-ui/fullchain1.pem && rm ~/Code/moup-ui/privkey1.pem && docker tag moup-ui:latest registry.moup.io/moup-ui:latest && docker push registry.moup.io/moup-ui:latest && ssh -i "~/moup-macbook-air.pem" ec2-user@3.147.184.206 sudo docker pull registry.moup.io/moup-ui:latest && ssh -i "~/moup-macbook-air.pem" ec2-user@3.147.184.206 sudo docker kill moup-ui && ssh -i "~/moup-macbook-air.pem" ec2-user@3.147.184.206 sudo docker rm moup-ui && ssh -i "~/moup-macbook-air.pem" ec2-user@3.147.184.206 sudo docker run -d --name moup-ui -p 80:80 -p 443:443 --restart always registry.moup.io/moup-ui:latest


# Build and Deploy Locally

# ON LOCAL INSTANCE
# ng build --configuration=production && cp /etc/letsencrypt/archive/moup.io/fullchain1.pem ~/Code/moup-ui && cp /etc/letsencrypt/archive/moup.io/privkey1.pem ~/Code/moup-ui && docker build --platform linux/amd64,linux/arm64 -t moup-ui . && rm ~/Code/moup-ui/fullchain1.pem && rm ~/Code/moup-ui/privkey1.pem && docker run -d --name moup-ui -p 80:80 -p 443:443 --restart always moup-ui:latest

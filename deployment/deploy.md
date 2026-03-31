# Deployment Guide

This guide outlines the steps to deploy the **Async Document Processing System** to a production server (VPS, AWS EC2, DigitalOcean Droplet, etc.).

## Prerequisites
- A Linux server (Ubuntu 20.04+ recommended)
- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed
- A domain name (optional but recommended)

---

## 1. Prepare Server
Clone the repository to your production server:
```bash
git clone <your-repo-url> /app
cd /app
```

## 2. Configuration (`.env`)
Create a production `.env` file based on `.env.example`:
```bash
cp .env.example .env
nano .env
```
Ensure you set:
- `GEMINI_API_KEY`: Your real Google AI Studio key.
- `POSTGRES_PASSWORD`: Use a strong, unique password.
- Any other service-specific environment variables.

## 3. Deploy Stack
Run the production Docker Compose stack:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```
This will:
1.  **Build** the optimized Next.js frontend (multi-stage).
2.  **Pull** official production images for PostgreSQL and Redis.
3.  **Setup** an Nginx container to proxy traffic to the correct services.
4.  **Auto-restart** any container if it crashes.

## 4. Reverse Proxy & SSL (Recommended)
By default, the Nginx container listens on port 80. If you have a domain, you should add SSL using Let's Encrypt / Certbot.

### Installing Certbot:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d example.com
```

### Update Nginx Config:
Update [deployment/nginx.conf](file:///d:/PROJECTS/Async%20Document%20Processing%20System/deployment/nginx.conf) on your server with your actual domain and restart:
```bash
docker-compose -f docker-compose.prod.yml restart nginx
```

## 5. Monitoring
- **Flower:** Accessible at `http://your-server-ip:5555` to monitor Celery tasks.
- **Docker Logs:** Monitor individual service health:
  ```bash
  docker-compose -f docker-compose.prod.yml logs -f --tail 100 worker
  ```

---

## Troubleshooting
- **API Connectivity:** Ensure `NEXT_PUBLIC_API_URL` is set to `/api` in `docker-compose.prod.yml`. Nginx will handle the internal routing.
- **Storage:** Ensure the `document_uploads` volume is accessible. Files are stored at `/app/uploads` in the backend container.
- **Memory Consumption:** If the worker kills itself, increase the server swap or memory. Processing large PDFs with OCR can be memory-intensive.

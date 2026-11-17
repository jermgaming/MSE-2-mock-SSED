# CampusHub — Docker & AWS ECR

A containerized CampusHub application demonstrating Docker image creation, multi-container architecture, and publishing container images to Amazon Elastic Container Registry (ECR).

## Project Overview

CampusHub is organized into separate application services:

- **API:** Backend application
- **Frontend:** User interface
- **Gateway:** Nginx reverse proxy

Docker is used to package the application services into portable container images. Amazon ECR is used as the private container image registry.

## Technology Stack

- Docker
- Docker Compose
- Nginx
- Node.js
- Amazon Web Services (AWS)
- Amazon Elastic Container Registry (ECR)
- Ubuntu EC2 for image building and publishing

## Project Structure

```text
CampusHub/
├── app/
│   ├── api/
│   ├── frontend/
│   ├── gateway/
│   │   └── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## Docker Images Published to AWS ECR

AWS Region: `ap-south-1` (Mumbai)

| Service | Image |
|---|---|
| API | `campushub-api:latest` |
| Frontend | `campushub-frontend:latest` |
| Gateway | `campushub-gateway:latest` |

### ECR Image URIs

```text
270546759573.dkr.ecr.ap-south-1.amazonaws.com/campushub-api:latest

270546759573.dkr.ecr.ap-south-1.amazonaws.com/campushub-frontend:latest

270546759573.dkr.ecr.ap-south-1.amazonaws.com/campushub-gateway:latest
```

## Build Docker Images

Run these commands from the project root:

```bash
docker build -t campushub-api:latest ./app/api

docker build -t campushub-frontend:latest ./app/frontend

docker build -f app/gateway/Dockerfile -t campushub-gateway:latest .
```

## Authenticate with Amazon ECR

Configure AWS CLI with an IAM identity that has ECR permissions.

```bash
aws configure
```

Authenticate:

```bash
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 270546759573.dkr.ecr.ap-south-1.amazonaws.com
```

## Push Images to ECR

```bash
docker tag campushub-api:latest 270546759573.dkr.ecr.ap-south-1.amazonaws.com/campushub-api:latest
docker push 270546759573.dkr.ecr.ap-south-1.amazonaws.com/campushub-api:latest

docker tag campushub-frontend:latest 270546759573.dkr.ecr.ap-south-1.amazonaws.com/campushub-frontend:latest
docker push 270546759573.dkr.ecr.ap-south-1.amazonaws.com/campushub-frontend:latest

docker tag campushub-gateway:latest 270546759573.dkr.ecr.ap-south-1.amazonaws.com/campushub-gateway:latest
docker push 270546759573.dkr.ecr.ap-south-1.amazonaws.com/campushub-gateway:latest
```

## Pull Images from ECR

An AWS identity with permission to pull from the private repositories is required.

```bash
docker pull 270546759573.dkr.ecr.ap-south-1.amazonaws.com/campushub-api:latest

docker pull 270546759573.dkr.ecr.ap-south-1.amazonaws.com/campushub-frontend:latest

docker pull 270546759573.dkr.ecr.ap-south-1.amazonaws.com/campushub-gateway:latest
```

## Verification

Images were successfully pushed to ECR and subsequently pulled using Docker.

```bash
docker images
```

## Security Notes

- ECR repositories are private.
- AWS credentials are not included in this repository.
- Use IAM permissions for ECR authentication and image access.
- Never commit `.env` files, private keys, or AWS credentials.

## Project Scope

This project demonstrates containerization and publishing Docker images to AWS ECR. Publishing images to ECR does not itself deploy or run the application on AWS.

---

**Project:** CampusHub  
**Cloud Region:** AWS Asia Pacific (Mumbai) — `ap-south-1`
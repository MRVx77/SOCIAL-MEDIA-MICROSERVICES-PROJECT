# 🌐 Social Media Microservices

A production-ready, scalable **social media backend** built with a microservices architecture. Each service is independently deployable, communicates asynchronously via **RabbitMQ**, and is fully containerized with **Docker**.

---

## 📐 Architecture Overview

```
                        ┌──────────────────────────────────────────────────┐
                        │                   API Gateway                    │
                        │            (Port 3000 - Entry Point)             │
                        │   Rate Limiting · Auth Validation · Proxying     │
                        └────────┬───────────┬───────────┬────────┬────────┘
                                 │           │           │        │
                    /v1/auth     │  /v1/posts│ /v1/media │        │ /v1/search
                                 │           │           │        │
               ┌─────────────────▼─┐ ┌───────▼──┐ ┌─────▼──┐ ┌──▼──────────┐
               │  Identity Service  │ │  Post     │ │ Media  │ │   Search    │
               │     (Port 3001)    │ │  Service  │ │Service │ │   Service   │
               │  Register · Login  │ │ (Port3002)│ │(3003)  │ │  (Port3004) │
               │  Refresh · Logout  │ └───────────┘ └────────┘ └─────────────┘
               └────────────────────┘
                                 │              │            │           │
                                 └──────────────┴────────────┴───────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │  RabbitMQ Message   │
                                          │       Broker        │
                                          └─────────────────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │   Redis Cache &     │
                                          │   Rate Limiting     │
                                          └─────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer              | Technology                                         |
|--------------------|----------------------------------------------------|
| Runtime            | Node.js 20 (Alpine)                                |
| Framework          | Express.js v5                                      |
| Database           | MongoDB + Mongoose                                 |
| Message Broker     | RabbitMQ 3 (with Management UI)                    |
| Cache / Rate Store | Redis (via ioredis)                                |
| Auth               | JWT (jsonwebtoken) + Argon2 password hashing       |
| Media Storage      | Cloudinary + Multer                                |
| Validation         | Joi                                                |
| Logging            | Winston                                            |
| Containerization   | Docker + Docker Compose                            |
| Security           | Helmet, CORS, express-rate-limit, rate-limiter-flexible |

---

## 📦 Services

### 🔑 Identity Service — `Port 3001`
Handles all user authentication and authorization.

| Method | Endpoint               | Description                          |
|--------|------------------------|--------------------------------------|
| POST   | `/v1/auth/register`    | Register a new user (rate limited)   |
| POST   | `/v1/auth/login`       | Login and receive JWT tokens         |
| POST   | `/v1/auth/refresh-token` | Refresh an expired access token    |
| POST   | `/v1/auth/logout`      | Logout and invalidate refresh token  |

**Key features:**
- Passwords hashed with **Argon2**
- Redis-backed DDoS protection (10 req/sec per IP)
- Sensitive endpoint limiter (50 req/15min for `/register`)
- JWT access + refresh token rotation

---

### 📝 Post Service — `Port 3002`
Manages creation, retrieval, and deletion of posts.

| Method | Endpoint                      | Description                |
|--------|-------------------------------|----------------------------|
| POST   | `/v1/posts/create-post`       | Create a new post          |
| GET    | `/v1/posts/get-all-posts`     | Fetch all posts (cached)   |
| GET    | `/v1/posts/:id`               | Get a single post by ID    |
| DELETE | `/v1/posts/:id`               | Delete a post              |

**Key features:**
- Redis response caching for read endpoints
- Publishes `post.deleted` event to RabbitMQ on deletion
- IP-based rate limiting (10 req/15min for post creation)
- All routes require a valid JWT

---

### 🖼️ Media Service — `Port 3003`
Handles file uploads and media management via Cloudinary.

| Method | Endpoint             | Description                          |
|--------|----------------------|--------------------------------------|
| POST   | `/v1/media/upload`   | Upload a media file (max 5MB)        |
| GET    | `/v1/media/get`      | Retrieve all uploaded media          |

**Key features:**
- Multipart file uploads via **Multer** (in-memory storage)
- Uploads stored in **Cloudinary** cloud storage
- Listens for `post.deleted` events via RabbitMQ to clean up orphaned media
- Upload endpoint rate limited (10 req/15min)

---

### 🔍 Search Service — `Port 3004`
Provides full-text post search functionality.

| Method | Endpoint              | Description               |
|--------|-----------------------|---------------------------|
| GET    | `/v1/search/posts`    | Search posts by query     |

**Key features:**
- Redis caching for repeated search queries
- Subscribes to `post.created` and `post.deleted` RabbitMQ events to keep its index in sync
- Rate limited search endpoint (10 req/15min)

---

### 🚦 API Gateway — `Port 3000`
Single entry point for all client requests.

**Key features:**
- Routes requests to the correct microservice using `express-http-proxy`
- Validates JWT tokens for all protected routes (`/v1/posts`, `/v1/media`, `/v1/search`)
- Injects `x-user-id` header into upstream requests
- Global rate limiting: **100 req / 15 min** per IP (backed by Redis)
- URL rewriting: `/v1/*` → `/api/*`

---

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started) & Docker Compose
- [Node.js 20+](https://nodejs.org/) (for local development only)
- A [Cloudinary](https://cloudinary.com/) account (for Media Service)
- A [MongoDB](https://www.mongodb.com/) instance / Atlas URI (per service)

---

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd social-media-microservices
```

---

### 2. Configure Environment Variables

Create a `.env` file inside **each** service directory. Templates are shown below.

#### `api-gateway/.env`
```env
PORT=3000
IDENTITY_SERVICE_URL=http://identity-service:3001
POST_SERVICE_URL=http://post-service:3002
MEDIA_SERVICE_URL=http://media-service:3003
SEARCH_SERVICE_URL=http://search-service:3004
JWT_SECRET=your_jwt_secret_here
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq:5672
```

#### `identity-service/.env`
```env
PORT=3001
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/identity-db
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq:5672
```

#### `post-service/.env`
```env
PORT=3002
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/post-db
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq:5672
```

#### `media-service/.env`
```env
PORT=3003
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/media-db
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq:5672
```

#### `search-service/.env`
```env
PORT=3004
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/search-db
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq:5672
```

---

### 3. Run with Docker Compose

```bash
docker-compose up --build
```

This starts all services, Redis, and RabbitMQ in a single command.

| Service         | URL                          |
|-----------------|------------------------------|
| API Gateway     | http://localhost:3000        |
| RabbitMQ UI     | http://localhost:15672       |
| Redis           | localhost:6379               |

---

### 4. Local Development (without Docker)

Run each service individually:

```bash
# Terminal 1 - API Gateway
cd api-gateway && npm install && npm run dev

# Terminal 2 - Identity Service
cd identity-service && npm install && npm run dev

# Terminal 3 - Post Service
cd post-service && npm install && npm run dev

# Terminal 4 - Media Service
cd media-service && npm install && npm run dev

# Terminal 5 - Search Service
cd search-service && npm install && npm run dev
```

> ⚠️ Ensure Redis and RabbitMQ are running locally (or via Docker) before starting any service.

---

## 📁 Project Structure

```
social-media-microservices/
├── api-gateway/
│   ├── src/
│   │   ├── middleware/       # Auth validation, error handling
│   │   ├── utils/            # Logger
│   │   └── server.js         # Gateway entrypoint & proxy config
│   ├── Dockerfile
│   └── package.json
│
├── identity-service/
│   ├── src/
│   │   ├── controllers/      # registerUser, loginUser, etc.
│   │   ├── db/               # MongoDB connection
│   │   ├── middleware/       # Error handler
│   │   ├── models/           # User model
│   │   ├── routes/           # Auth routes
│   │   └── utils/            # Logger, token helpers
│   ├── Dockerfile
│   └── package.json
│
├── post-service/
│   ├── src/
│   │   ├── controllers/      # createPost, getPost, deletePost
│   │   ├── middleware/       # Auth, error handler
│   │   ├── models/           # Post model
│   │   ├── routes/           # Post routes
│   │   └── utils/            # Logger, RabbitMQ helpers
│   ├── Dockerfile
│   └── package.json
│
├── media-service/
│   ├── src/
│   │   ├── controllers/      # uploadMedia, getAllMedia
│   │   ├── eventHandlers/    # Handles post.deleted events
│   │   ├── middleware/       # Auth, error handler
│   │   ├── models/           # Media model
│   │   ├── routes/           # Media routes (multer upload)
│   │   └── utils/            # Logger, RabbitMQ, Cloudinary
│   ├── Dockerfile
│   └── package.json
│
├── search-service/
│   ├── src/
│   │   ├── controllers/      # searchPostController
│   │   ├── eventHandler/     # Handles post.created / post.deleted
│   │   ├── middleware/       # Auth, error handler
│   │   ├── models/           # Search index model
│   │   ├── routes/           # Search routes
│   │   └── utils/            # Logger, RabbitMQ helpers
│   ├── Dockerfile
│   └── package.json
│
└── docker-compose.yml
```

---

## 🔄 Event-Driven Communication (RabbitMQ)

Services communicate asynchronously through RabbitMQ events, keeping them fully decoupled.

| Event           | Publisher      | Subscribers                     |
|-----------------|----------------|---------------------------------|
| `post.created`  | Post Service   | Search Service (index new post) |
| `post.deleted`  | Post Service   | Media Service, Search Service   |

---

## 🛡️ Security

- **Helmet.js** — sets secure HTTP response headers on all services
- **CORS** — cross-origin request handling
- **JWT Authentication** — validated at the API Gateway before forwarding requests
- **Argon2** — industry-standard password hashing in Identity Service
- **Rate Limiting** (multi-layer):
  - Global: 100 req/15min at the gateway
  - Per-service DDoS protection: 10 req/sec via `rate-limiter-flexible`
  - Sensitive endpoint limits: 10–50 req/15min for registration, post creation, search, and uploads
  - All rate-limit counters stored in **Redis** for distributed accuracy

---

## 📊 Logging

Every service uses **Winston** for structured logging. Logs are written to:
- `combine.log` — all logs
- `error.log` — error-level logs only

---

## 📜 License

This project is licensed under the **ISC License**.

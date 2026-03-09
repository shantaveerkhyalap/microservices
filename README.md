# 🚀 Microservices Platform (Intermediate Level)

A distributed microservices system built with **Node.js**, **Express.js**, **RabbitMQ**, and **MongoDB**, orchestrated locally with **Docker Compose**.

## 🏗️ Architecture

```
                    ┌─────────────────────┐
                    │   API Gateway :3000  │
                    │  Centralized Routing │
                    │   + JWT Auth Lock    │
                    └──────┬──┬──┬────────┘
                           │  │  │
              ┌────────────┘  │  └────────────┐
              ▼               ▼               ▼
    ┌─────────────┐  ┌──────────────┐  ┌─────────────┐
    │ User Service │  │Product Service│  │Order Service │
    │    :3001     │  │    :3002     │  │    :3003     │
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │
           ▼                ▼                ▼
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │ MongoDB   │    │ MongoDB   │    │ MongoDB   │
    │ users_db  │    │products_db│    │ orders_db │
    └───────────┘    └───────────┘    └───────────┘
           │                │                │
           └────────┬───────┴────────┬───────┘
                    ▼                ▼
             ┌───────────┐
             │  RabbitMQ  │
             │   :5672    │
             └───────────┘
```

## 📦 Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Node.js + Express.js** | Service runtime & REST API framework |
| **MongoDB** | Database per service (data isolation and loose coupling) |
| **RabbitMQ** | Event-driven async messaging broker |
| **Docker Compose** | Local orchestration and containerization |

## 🛠️ What is Infrastructure?

In a microservices world, **"Infrastructure"** refers to the foundational systems that your application services rely on to store data, communicate, and run reliably. These are managed separately from your application business logic.

In this project, the infrastructure consists of:

### 1. MongoDB (The Persistent Layer)
*   **What it is:** A NoSQL database used for storing data.
*   **Why it's Infrastructure:** Each service (User, Product, Order) has its own independent database. This ensures **Data Isolation** - if the User database fails, the Product catalog can still be browsed.

### 2. RabbitMQ (The Communication Bus)
*   **What it is:** A message broker that lets services "talk" asynchronously.
*   **Why it's Infrastructure:** Instead of services calling each other directly (which makes them fragile), they send "messages" to RabbitMQ. RabbitMQ safely holds these messages even if a service is down, ensuring **Zero Data Loss**.

### 3. Docker & Docker Compose (The Orchestration Layer)
*   **What it is:** A system to package and run software in "containers".
*   **Why it's Infrastructure:** It provides the environment for our code to run identical on any machine (Local, Staging, or Production).

---

## 🔥 Key Features

- **API Gateway** — Centralized routing, JWT authentication middleware, and basic rate limiting.
- **Microservices Design Pattern** — 4 independent services each with its own responsibility and database.
- **Event-Driven Architecture** — Services communicate asynchronously using RabbitMQ pub/sub.
- **Zero Data Loss (Resilience)** — Messages are persisted in durable RabbitMQ queues.
- **Dockerized Infrastructure** — Easy setup with `docker-compose up`.

## 🚀 Quick Start

### Run with Docker Compose
```bash
docker-compose up --build
```

## 📡 API Endpoints (via API Gateway `:3000`)

### Auth (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register new user |
| POST | `/api/users/login` | Login, get JWT token |

### Users (Authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get user profile |
| POST | `/api/users/logout` | Logout |

*(Full details in notesMicroservices)*

## 📊 Monitoring

- **RabbitMQ Management UI**: http://localhost:15672 (Credentials: `guest` / `guest`)
- **API Gateway Health Check**: http://localhost:3000/health

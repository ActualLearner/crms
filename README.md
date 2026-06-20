# CRMS - Car Rental Management System

> Full-stack car rental management platform with a PHP API, vanilla JavaScript frontend, MySQL database, and Docker-based deployment.  
> PHP 8.1+ · No Composer dependencies · MySQL 8.0 · Nginx frontend · Custom Miniframe backend

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Core Features](#core-features)
6. [Documentation](#documentation)
7. [Development](#development)

---

## Overview

CRMS is a car rental management system for customers and administrators.

### What it includes

- Customer portal for browsing cars, bookings, favourites, reviews, and waitlists
- Admin dashboard for fleet, customers, bookings, promos, and damage reports
- AI-powered recommendations and chat support
- Booking validation and availability checks with transaction safety
- Chapa hosted checkout integration with server-side verification and webhooks
- Dockerized setup for local development and deployment

### Tech stack

| Component | Technology |
|---|---|
| Backend API | PHP 8.1+ custom Miniframe framework |
| Frontend | Vanilla JavaScript SPA |
| Database | MySQL 8.0 |
| Web server | Nginx |
| Deployment | Docker Compose |
| AI | Google Gemini API |

---

## Architecture

```text
Browser
  ↓
Nginx frontend
  ↓
PHP API (Miniframe)
  ↓
MySQL database
```

The API uses a simple flow:

```text
Router → Middleware → Controller → Model → QueryBuilder → PDO
```

---

## Project Structure

```text
crms/
├── docker-compose.yml         ← Orchestrates MySQL, API, and frontend
├── README.md                  ← Project overview
├── skills-lock.json           ← Agent skills config
├── scripts/                   ← Utility upload scripts
├── crms-api/                  ← PHP backend API
│   ├── index.php              ← Single entry point
│   ├── Dockerfile             ← API container image
│   ├── config/routes.php      ← API routes
│   ├── core/                  ← Router, controller, model, DB helpers
│   ├── controllers/           ← Request handlers
│   ├── models/                ← Data models
│   ├── middleware/            ← CORS, auth, and rate limiting
│   ├── database/              ← Schema and SQL dump
│   └── public/uploads/        ← Uploaded car images
├── crms-frontend/             ← Static frontend app
│   ├── index.html             ← Redirects to login
│   ├── Dockerfile             ← Frontend container image
│   ├── nginx.conf             ← Nginx config
│   ├── pages/                 ← HTML pages
│   ├── assets/css/            ← Shared styling
│   └── js/                    ← Router, state, API client, page logic
```

---

## Getting Started

### With Docker

```bash
git clone <repo-url>
cd crms

cp crms-api/.env.example crms-api/.env

docker-compose up -d --build
```

### Local development

```bash
cd crms-api
php -S localhost:3000 index.php
```

Serve the frontend with any static server, then point it at the API.

### Environment variables

```env
APP_ENV=development
ALLOWED_ORIGIN=http://localhost:8080
DB_HOST=db
DB_NAME=crms
DB_USER=crms_user
DB_PASS=crms_password
RATE_LIMIT=5
GEMINI_API_KEY=your_key_here
CHAPA_BASE_URL=https://api.chapa.co
CHAPA_SECRET_KEY=your_chapa_secret_key_here
CHAPA_WEBHOOK_SECRET=your_chapa_webhook_secret_here
CHAPA_CURRENCY=USD
API_PUBLIC_URL=http://localhost:8080/api
FRONTEND_URL=http://localhost:8080
```

Chapa supports ETB and USD; keep `CHAPA_CURRENCY` aligned with the currency used for stored car rates and frontend totals.

---

## Core Features

### Customer

- Browse vehicles with filters
- View car details and availability
- Create bookings and extend active bookings
- Save favourites
- Leave reviews
- Join the waitlist for unavailable cars
- Report damage

### Admin

- Manage vehicles and uploads
- Review bookings and customers
- Handle promotions
- Process damage reports
- View dashboard statistics


### Payments

- A customer picks a car and dates, which creates a pending booking that holds those dates for 10 minutes.
- They are taken straight to a checkout page and pay with Chapa hosted checkout (`data.checkout_url`).
- Chapa callbacks and webhooks are always verified with Chapa's transaction verify endpoint before marking a booking paid; a successful payment automatically confirms the booking and reserves the car — there is no admin approval step.
- Unpaid holds that aren't paid within 10 minutes are released automatically, freeing the dates.
- Configure `API_PUBLIC_URL` for the public API base used by Chapa callbacks and `FRONTEND_URL` for the return page.

### Technical

- Session-based authentication
- Role-based access control
- Transaction support for booking safety
- Rate limiting per IP
- CORS support
- Gemini API integration

---

## Documentation

- [Backend API and framework docs](crms-api/Readme.md)
- [Database schema](crms-api/database/crms.sql)
- [Docker Compose](docker-compose.yml)

---

## Development

### Testing

```bash
cd crms-api
php test.php
```

### Notes

- The detailed Miniframe framework reference lives in [crms-api/Readme.md](crms-api/Readme.md).
- The root README is intentionally kept short and project-focused.

# ThirstyBird API - Development Setup

## 🐳 Docker Development Environment (Recommended)

Since you have Docker installed, this is the easiest way to get everything running:

### Quick Start

1. **Clone and setup:**
```bash
cd thirstybird-platform/thirstybird-api
cp .env.example .env
# Edit .env with your settings (or leave defaults for development)
```

2. **Start all services:**
```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **Redis** on port 6379  
- **Adminer** (database UI) on port 8080
- **Redis Commander** (Redis UI) on port 8081

3. **Install API dependencies:**
```bash
npm install
```

4. **Run database migrations:**
```bash
npm run migrate
```

5. **Seed test data:**
```bash
npm run seed
```

6. **Start the API server:**
```bash
npm run dev
```

### 🔧 Development URLs

- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Database UI (Adminer)**: http://localhost:8080
  - System: PostgreSQL
  - Server: postgres  
  - Username: thirstybird
  - Password: dev_password_123
  - Database: thirstybird
- **Redis UI**: http://localhost:8081

### 🗄️ Database Access

**Via Adminer (Web UI):**
Go to http://localhost:8080 and use the credentials above.

**Via CLI:**
```bash
# Connect to PostgreSQL
docker exec -it thirstybird-db psql -U thirstybird -d thirstybird

# Connect to Redis
docker exec -it thirstybird-redis redis-cli -a dev_redis_pass
```

### 📊 Monitoring

Check service health:
```bash
# View all containers
docker-compose ps

# View logs
docker-compose logs -f api
docker-compose logs -f postgres
docker-compose logs -f redis
```

## 🛠 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Venues
- `GET /api/venues` - List venues
- `GET /api/venues/:id` - Get venue details
- `POST /api/venues` - Create venue (venue role)
- `PUT /api/venues/:id` - Update venue (venue role)

### Deals
- `GET /api/deals` - List deals
- `GET /api/deals/:id` - Get deal details
- `POST /api/deals` - Create deal (venue role)
- `PUT /api/deals/:id` - Update deal (venue role)
- `DELETE /api/deals/:id` - Delete deal (venue role)

### Vouchers
- `GET /api/vouchers` - List user vouchers
- `POST /api/vouchers/purchase` - Purchase vouchers
- `POST /api/vouchers/redeem` - Redeem voucher (venue role)
- `GET /api/vouchers/:id/qr` - Get QR code

### Payments
- `POST /api/payments/payfast` - PayFast payment
- `POST /api/payments/webhook` - Payment webhook
- `GET /api/payments/status/:id` - Payment status

## 🧪 Testing

```bash
# Run unit tests
npm test

# Test API endpoints
curl http://localhost:3000/health

# Test rate limiting
for i in {1..10}; do curl http://localhost:3000/health; done
```

## 🚀 Production Deployment

```bash
# Build for production
npm run build

# Start in production mode
NODE_ENV=production npm start
```

## 📝 Environment Variables

Copy `.env.example` to `.env` and configure:

- **JWT_SECRET**: Use a strong, random 32+ character secret
- **PAYFAST_***: Your PayFast merchant credentials
- **SMTP_***: Email server configuration

## 🔒 Security Features

- **Rate limiting**: 100 req/15min general, 10 req/15min auth, 5 req/10min payments
- **JWT authentication** with role-based access control
- **Input validation** with Joi schemas
- **CORS protection** with specific origins
- **Helmet security headers**
- **Redis session storage**
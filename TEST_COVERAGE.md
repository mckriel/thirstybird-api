# Test Coverage Tracker

## Current Status: **19.04% Overall Coverage**

### ✅ **Completed Test Suites (100% Coverage)**
- [x] **Infrastructure Tests** (6 tests) - Database connectivity & table existence
- [x] **Validation Tests** (11 tests) - Joi schema validation & sanitization  
- [x] **User Model Tests** (17 tests) - Complete CRUD operations & user management
- [x] **Voucher Model Tests** (30 tests) - Complete voucher functionality

### 🟡 **Partially Covered (Needs Improvement)**
- [x] **Deal Model Tests** (17 tests) - **81.7% coverage** - Missing error handling paths
- [x] **Venue Model Tests** (12 tests) - **63.03% coverage** - Missing significant functionality

### ❌ **Missing Test Suites (0% Coverage)**

#### **High Priority - Core Business Logic**
- [ ] **Payment Model Tests** - Payment processing, transactions, refunds
- [ ] **Auth Service Tests** - Authentication, authorization, JWT handling
- [ ] **Deal Service Tests** - Deal creation, validation, business rules
- [ ] **Venue Service Tests** - Venue management, analytics
- [ ] **Voucher Service Tests** - Voucher lifecycle, redemption logic
- [ ] **Payment Service Tests** - Payment processing, gateway integration

#### **Medium Priority - API Layer**
- [ ] **Auth Controller Tests** - Login, register, token refresh endpoints
- [ ] **User Controller Tests** - User management API endpoints
- [ ] **Venue Controller Tests** - Venue CRUD API endpoints
- [ ] **Deal Controller Tests** - Deal management API endpoints
- [ ] **Voucher Controller Tests** - Voucher API endpoints
- [ ] **Payment Controller Tests** - Payment processing endpoints

#### **Medium Priority - Middleware & Routes**
- [ ] **Auth Middleware Tests** - JWT validation, role checks
- [ ] **Rate Limiter Tests** - API rate limiting
- [ ] **Error Handler Tests** - Error response formatting
- [ ] **Security Headers Tests** - CORS, headers validation
- [ ] **Security Logger Tests** - Security event logging
- [ ] **Route Tests** - API routing and endpoint registration

#### **Lower Priority - Supporting Infrastructure**
- [ ] **Email Service Tests** - Email sending, templates
- [ ] **Database Connection Tests** (improve coverage) - Error handling paths
- [ ] **Redis Tests** - Caching functionality
- [ ] **Utility Tests** - Environment validation, helpers

## Coverage Thresholds

### **Target Thresholds (vitest.config.js)**
- **Models**: 95% lines/functions/statements, 90% branches
- **Services**: 90% lines/functions/statements, 85% branches
- **Global**: 85% lines/functions/statements, 80% branches

### **Current vs Target**
| Component | Current | Target | Gap |
|-----------|---------|--------|-----|
| Models | 64.14% lines | 95% | -30.86% |
| Services | 0% | 90% | -90% |
| Global | 19.04% lines | 85% | -65.96% |

## Next Steps

1. **Complete Model Coverage** - Fix deal.js and venue.js gaps
2. **Add Service Layer Tests** - Core business logic coverage
3. **Add Controller Tests** - API endpoint coverage
4. **Add Middleware Tests** - Security and validation coverage
5. **Integration Tests** - End-to-end API testing

## Notes
- All tests run sequentially to avoid database conflicts
- Using PostgreSQL test database with proper cleanup
- Following incremental approach: one suite at a time, verify passing before next
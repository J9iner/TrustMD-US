# TrustMD API Documentation

**Comprehensive REST API for TrustMD Medical Compliance Logbook**

## 🚀 Getting Started

### **Base URL**
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

### **Authentication**
All API requests (except login/register) require authentication:
```bash
Authorization: Bearer <session_token>
Content-Type: application/json
```

### **Rate Limiting**
- **100 requests per minute** per client
- **Sliding window** implementation
- **HTTP 429** response when limit exceeded

---

## 🔐 Authentication Endpoints

### **POST /auth/login**
Authenticate user and create session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "rememberMe": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "practitioner",
      "tenantId": "uuid"
    },
    "session": {
      "sessionId": "uuid",
      "token": "jwt_token",
      "expiresAt": "2024-01-15T10:30:00Z",
      "maxAge": 86400000
    }
  }
}
```

**Error Responses:**
- `401` - Invalid credentials
- `429` - Rate limit exceeded
- `500` - Server error

---

### **POST /auth/logout**
Terminate user session.

**Headers:**
```bash
Authorization: Bearer <session_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Session terminated successfully"
}
```

---

### **POST /auth/refresh**
Refresh existing session token.

**Request Body:**
```json
{
  "sessionId": "uuid",
  "refreshToken": "refresh_token"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "expiresAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### **GET /auth/profile**
Get current user profile.

**Headers:**
```bash
Authorization: Bearer <session_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "practitioner",
    "tenantId": "uuid",
    "permissions": ["read_compliance", "write_documents"],
    "lastLogin": "2024-01-14T10:30:00Z"
  }
}
```

---

## 📊 Compliance Endpoints

### **GET /compliance/score**
Get current compliance score for user/tenant.

**Headers:**
```bash
Authorization: Bearer <session_token>
```

**Query Parameters:**
- `stateCode` (optional): Filter by state (e.g., "CA", "NY")
- `category` (optional): Filter by category (e.g., "licensure", "training")

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overallScore": 87.5,
    "stateScores": {
      "CA": 92.0,
      "NY": 85.0
    },
    "categoryScores": {
      "licensure": 95.0,
      "training": 80.0,
      "documentation": 88.0
    },
    "lastUpdated": "2024-01-15T10:30:00Z",
    "trend": "improving"
  }
}
```

---

### **GET /compliance/gaps**
Identify compliance gaps and missing requirements.

**Headers:**
```bash
Authorization: Bearer <session_token>
```

**Query Parameters:**
- `severity` (optional): "critical", "high", "medium", "low"
- `stateCode` (optional): Filter by state

**Response (200):**
```json
{
  "success": true,
  "data": {
    "gaps": [
      {
        "id": "uuid",
        "title": "California Medical License Renewal",
        "description": "Medical license expires in 30 days",
        "severity": "critical",
        "stateCode": "CA",
        "category": "licensure",
        "dueDate": "2024-02-15T00:00:00Z",
        "recommendation": "Submit renewal application immediately"
      }
    ],
    "totalGaps": 5,
    "criticalGaps": 1,
    "highGaps": 2
  }
}
```

---

### **POST /compliance/assess**
Run comprehensive risk assessment.

**Headers:**
```bash
Authorization: Bearer <session_token>
```

**Request Body:**
```json
{
  "assessmentType": "comprehensive",
  "states": ["CA", "NY", "TX"],
  "includeFederal": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "assessmentId": "uuid",
    "auditProbability": 15.5,
    "riskLevel": "medium",
    "complianceScore": 87.5,
    "recommendations": [
      {
        "priority": "high",
        "action": "Renew California medical license",
        "impact": "Reduces audit probability by 5%",
        "timeline": "30 days"
      }
    ],
    "completedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### **GET /compliance/reports**
Generate compliance reports.

**Headers:**
```bash
Authorization: Bearer <session_token>
```

**Query Parameters:**
- `type`: "summary", "detailed", "audit"
- `format`: "json", "pdf", "html"
- `dateRange`: "30d", "90d", "1y"

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reportId": "uuid",
    "type": "detailed",
    "format": "pdf",
    "downloadUrl": "/api/reports/download/uuid",
    "expiresAt": "2024-01-16T10:30:00Z",
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 📁 Document Management

### **GET /documents**
List compliance documents for user/tenant.

**Headers:**
```bash
Authorization: Bearer <session_token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `category`: Filter by category
- `status`: Filter by status ("current", "expired", "expiring")

**Response (200):**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "uuid",
        "title": "California Medical License",
        "category": "licensure",
        "stateCode": "CA",
        "status": "current",
        "uploadDate": "2024-01-01T00:00:00Z",
        "expirationDate": "2024-12-31T00:00:00Z",
        "fileSize": 2048576,
        "fileType": "application/pdf"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### **POST /documents/upload**
Upload document metadata.

**Headers:**
```bash
Authorization: Bearer <session_token>
Content-Type: multipart/form-data
```

**Request Body:**
```
file: [binary file data]
title: "Document Title"
category: "licensure"
stateCode: "CA"
expirationDate: "2024-12-31T00:00:00Z"
description: "Document description"
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "California Medical License",
    "category": "licensure",
    "stateCode": "CA",
    "status": "current",
    "uploadDate": "2024-01-15T10:30:00Z",
    "expirationDate": "2024-12-31T00:00:00Z",
    "fileSize": 2048576,
    "fileType": "application/pdf"
  }
}
```

---

### **PUT /documents/:id**
Update document metadata.

**Headers:**
```bash
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Document Title",
  "expirationDate": "2024-12-31T00:00:00Z",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Updated Document Title",
    "expirationDate": "2024-12-31T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### **DELETE /documents/:id**
Delete document.

**Headers:**
```bash
Authorization: Bearer <session_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

## 🏢 State Compliance

### **GET /states/available**
Get list of available state compliance modules.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "states": [
      {
        "code": "CA",
        "name": "California",
        "tier": 1,
        "complexity": "high",
        "requirements": 45
      },
      {
        "code": "NY",
        "name": "New York", 
        "tier": 1,
        "complexity": "high",
        "requirements": 42
      }
    ]
  }
}
```

---

### **GET /states/:code/requirements**
Get compliance requirements for specific state.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stateCode": "CA",
    "stateName": "California",
    "requirements": [
      {
        "id": "ca-license",
        "title": "California Medical License",
        "description": "Active California medical license",
        "mandatory": true,
        "category": "licensure",
        "riskLevel": "critical",
        "points": 20
      }
    ]
  }
}
```

---

## 👥 User Management

### **GET /users/profile**
Get user profile details.

**Headers:**
```bash
Authorization: Bearer <session_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "practitioner",
    "tenantId": "uuid",
    "permissions": ["read_compliance", "write_documents"],
    "states": ["CA", "NY"],
    "specialty": "family_medicine",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### **PUT /users/profile**
Update user profile.

**Headers:**
```bash
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "specialty": "family_medicine",
  "states": ["CA", "NY"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "specialty": "family_medicine",
    "states": ["CA", "NY"],
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 🏥 Tenant Management

### **GET /tenant/info**
Get tenant information.

**Headers:**
```bash
Authorization: Bearer <session_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Medical Practice LLC",
    "type": "private_practice",
    "size": "small",
    "states": ["CA", "NY"],
    "subscription": "professional",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## 📈 Analytics & Reporting

### **GET /analytics/compliance**
Get compliance analytics data.

**Headers:**
```bash
Authorization: Bearer <session_token>
```

**Query Parameters:**
- `period`: "7d", "30d", "90d", "1y"
- `metric`: "score", "gaps", "documents", "risk"

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "metrics": {
      "complianceScore": {
        "current": 87.5,
        "previous": 85.2,
        "change": "+2.3"
      },
      "auditProbability": {
        "current": 15.5,
        "previous": 18.2,
        "change": "-2.7"
      }
    },
    "trends": [
      {
        "date": "2024-01-01",
        "score": 85.0,
        "risk": 18.0
      }
    ]
  }
}
```

---

## 🔄 Real-time Updates

### **WebSocket Connection**
Connect to real-time updates:

```javascript
const ws = new WebSocket('wss://your-domain.com/ws');

// Authenticate
ws.send(JSON.stringify({
  type: 'auth',
  token: 'session_token'
}));

// Subscribe to updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['compliance', 'documents', 'alerts']
}));
```

**Real-time Events:**
```json
{
  "type": "compliance_score_update",
  "data": {
    "score": 88.5,
    "change": "+1.0",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## ❌ Error Responses

### **Standard Error Format**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### **Common Error Codes**
- `VALIDATION_ERROR` - Invalid input data
- `AUTHENTICATION_ERROR` - Invalid credentials
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SESSION_EXPIRED` - Session has expired
- `TENANT_LIMIT_EXCEEDED` - Tenant limit reached
- `FILE_TOO_LARGE` - Upload file size exceeded
- `UNSUPPORTED_FILE_TYPE` - Invalid file format

---

## 📝 Response Codes

| Code | Description |
|------|-------------|
| `200` | OK - Request successful |
| `201` | Created - Resource created |
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Authentication required |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource not found |
| `409` | Conflict - Resource conflict |
| `413` | Payload Too Large - File size exceeded |
| `415` | Unsupported Media Type - Invalid file format |
| `422` | Unprocessable Entity - Validation failed |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error - Server error |

---

## 🔒 Security Considerations

### **Session Management**
- Sessions expire after **30 minutes** of inactivity
- Maximum session age: **24 hours**
- Maximum concurrent sessions: **5 per user**
- Automatic cleanup of expired sessions

### **Rate Limiting**
- **100 requests per minute** per client
- Sliding window implementation
- HTTP 429 response when exceeded
- Client identification via `x-client-id` header

### **Input Validation**
- All inputs validated and sanitized
- XSS protection enabled
- SQL injection prevention
- File type and size validation

### **Data Encryption**
- AES-256-GCM encryption at rest
- HTTPS required in production
- Sensitive data encrypted in transit
- PHI protection (compliance logbook only)

---

## 🧪 Testing

### **Test Environment**
```bash
# Base URL
https://api-test.trustmd.com/api

# Test Credentials
Email: test@example.com
Password: TestPassword123
```

### **Postman Collection**
Download Postman collection for API testing:
[TrustMD API Collection](./postman-collection.json)

---

## 📞 Support

### **API Support**
- Email: api-support@trustmd.com
- Documentation: [TrustMD API Docs](https://docs.trustmd.com)
- Status Page: [API Status](https://status.trustmd.com)

### **Rate Limit Appeals**
For rate limit increases, contact:
- Email: enterprise@trustmd.com
- Include: Use case, expected volume, tenant ID

---

**Last Updated**: January 15, 2024
**API Version**: v1.0.0

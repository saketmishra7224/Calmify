# Saneyar Mental Health Platform - API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [Health Check](#health-check)
6. [Authentication Endpoints](#authentication-endpoints)
7. [Session Management](#session-management)
8. [Message Endpoints](#message-endpoints)
9. [Crisis Management](#crisis-management)
10. [AI/Chatbot Endpoints](#aichatbot-endpoints)
11. [Urgent Operations](#urgent-operations)
12. [Socket.io Events](#socketio-events)
13. [Examples](#examples)

---

## Overview

The Saneyar Mental Health Platform API provides endpoints for managing mental health support sessions, crisis detection, AI-powered chatbot interactions, and real-time communication between patients, peers, and counselors.

**Base URL**: 
- Development: `http://localhost:5000`
- Production: `https://your-domain.com`

**API Version**: v1

---

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Token Types
- **Access Token**: Valid for 1 hour, used for API requests
- **Refresh Token**: Valid for 30 days, used to obtain new access tokens

---

## Error Handling

All API errors follow this standard format:

```json
{
  "error": "Error message description",
  "details": "Additional technical details (development only)",
  "code": "ERROR_CODE",
  "timestamp": "2025-09-22T10:30:00.000Z",
  "path": "/api/endpoint"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Rate Limiting

### General API Limits
- **100 requests per 15 minutes** per IP address
- **Headers included in response**:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time

### Authentication Limits
- **5 requests per 15 minutes** per IP address for login/register

---

## Health Check

### GET /health

Check server health and status.

**Authentication**: Not required

**Request**: No parameters

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-09-22T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "database": "connected",
  "services": {
    "mongodb": "healthy",
    "azure_openai": "healthy",
    "email": "healthy"
  },
  "uptime": 3600
}
```

---

## Authentication Endpoints

### POST /api/auth/register

Register a new user account.

**Authentication**: Not required  
**Rate Limited**: 5 requests per 15 minutes

**Request Body**:
```json
{
  "username": "johndoe123",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "role": "patient",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "age": 25,
    "preferredName": "Johnny",
    "phoneNumber": "+1234567890",
    "emergencyContact": {
      "name": "Jane Doe",
      "relationship": "Sister",
      "phone": "+1234567891"
    },
    "preferences": {
      "language": "en",
      "timezone": "America/New_York",
      "notifications": {
        "email": true,
        "sms": false,
        "push": true
      }
    }
  },
  "agreedToTerms": true,
  "agreedToPrivacy": true
}
```

**Validation Rules**:
- `email`: Valid email format, unique
- `password`: Minimum 8 characters, must contain uppercase, lowercase, number, and special character
- `role`: One of: `patient`, `peer`, `counselor`, `admin`
- `age`: Must be 13 or older

**Success Response (201)**:
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "60f7b1234567890abcdef123",
    "username": "johndoe123",
    "email": "john.doe@example.com",
    "role": "patient",
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "age": 25,
      "preferredName": "Johnny"
    },
    "isVerified": false,
    "isOnline": false,
    "createdAt": "2025-09-22T10:30:00.000Z",
    "lastLoginAt": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "verificationEmail": "sent"
}
```

**Error Responses**:
```json
// 400 - Validation Error
{
  "error": "Validation failed",
  "details": {
    "email": "Email already exists",
    "password": "Password must contain at least one uppercase letter"
  }
}

// 409 - Conflict
{
  "error": "User already exists",
  "details": "An account with this email already exists"
}
```

---

### POST /api/auth/login

Authenticate user and obtain access token.

**Authentication**: Not required  
**Rate Limited**: 5 requests per 15 minutes

**Request Body**:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "rememberMe": true
}
```

**Success Response (200)**:
```json
{
  "message": "Login successful",
  "user": {
    "_id": "60f7b1234567890abcdef123",
    "username": "johndoe123",
    "email": "john.doe@example.com",
    "role": "patient",
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "preferredName": "Johnny"
    },
    "isOnline": true,
    "lastLoginAt": "2025-09-22T10:30:00.000Z",
    "preferences": {
      "language": "en",
      "timezone": "America/New_York"
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Error Responses**:
```json
// 401 - Invalid Credentials
{
  "error": "Invalid credentials",
  "details": "Email or password is incorrect"
}

// 423 - Account Locked
{
  "error": "Account temporarily locked",
  "details": "Too many failed login attempts. Try again in 30 minutes.",
  "retryAfter": 1800
}
```

---

### POST /api/auth/logout

Logout user and invalidate tokens.

**Authentication**: Required

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200)**:
```json
{
  "message": "Logout successful"
}
```

---

### POST /api/auth/refresh

Refresh access token using refresh token.

**Authentication**: Not required

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

---

### POST /api/auth/forgot-password

Request password reset email.

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "john.doe@example.com"
}
```

**Success Response (200)**:
```json
{
  "message": "Password reset email sent",
  "details": "If an account exists with this email, you will receive reset instructions"
}
```

---

### POST /api/auth/reset-password

Reset password using reset token.

**Authentication**: Not required

**Request Body**:
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

**Success Response (200)**:
```json
{
  "message": "Password reset successful"
}
```

---

## Session Management

### POST /api/sessions

Create a new support session.

**Authentication**: Required

**Request Body**:
```json
{
  "helperType": "peer",
  "severity": "medium", 
  "description": "I'm feeling anxious about an upcoming job interview and need someone to talk to",
  "isAnonymous": false,
  "preferences": {
    "ageRange": "20-30",
    "gender": "any",
    "language": "en",
    "experience": "general"
  },
  "tags": ["anxiety", "career", "interview"],
  "scheduledFor": null
}
```

**Field Descriptions**:
- `helperType`: `peer` | `counselor` | `chatbot`
- `severity`: `low` | `medium` | `high` | `critical`
- `isAnonymous`: Whether to hide user identity
- `scheduledFor`: ISO date string for scheduled sessions (optional)

**Success Response (201)**:
```json
{
  "message": "Session created successfully",
  "session": {
    "_id": "60f7b1234567890abcdef124",
    "patientId": "60f7b1234567890abcdef123",
    "helperId": null,
    "helperType": "peer",
    "status": "waiting",
    "severity": "medium",
    "description": "I'm feeling anxious about an upcoming job interview",
    "isAnonymous": false,
    "preferences": {
      "ageRange": "20-30",
      "gender": "any",
      "language": "en"
    },
    "tags": ["anxiety", "career", "interview"],
    "createdAt": "2025-09-22T10:30:00.000Z",
    "estimatedWaitTime": 300,
    "queuePosition": 3
  },
  "availableHelpers": 5,
  "emergencyContacts": {
    "crisis": "988",
    "emergency": "911",
    "text": "Text HOME to 741741"
  }
}
```

---

### GET /api/sessions

Get user's sessions with filtering and pagination.

**Authentication**: Required

**Query Parameters**:
- `status`: Filter by status (`waiting`, `active`, `closed`, `escalated`)
- `helperType`: Filter by helper type (`peer`, `counselor`, `chatbot`)
- `severity`: Filter by severity (`low`, `medium`, `high`, `critical`)
- `limit`: Number of sessions per page (default: 20, max: 100)
- `page`: Page number (default: 1)
- `sort`: Sort field (`createdAt`, `updatedAt`, `status`)
- `order`: Sort order (`asc`, `desc`)
- `dateFrom`: Start date filter (ISO string)
- `dateTo`: End date filter (ISO string)

**Example Request**:
```http
GET /api/sessions?status=active&limit=10&page=1&sort=createdAt&order=desc
```

**Success Response (200)**:
```json
{
  "sessions": [
    {
      "_id": "60f7b1234567890abcdef124",
      "patientId": {
        "_id": "60f7b1234567890abcdef123",
        "username": "johndoe123",
        "profile": {
          "firstName": "John",
          "preferredName": "Johnny"
        }
      },
      "helperId": {
        "_id": "60f7b1234567890abcdef125",
        "username": "helper_sarah",
        "profile": {
          "firstName": "Sarah",
          "specializations": ["anxiety", "career"]
        }
      },
      "status": "active",
      "severity": "medium",
      "helperType": "peer",
      "description": "I'm feeling anxious about an upcoming job interview",
      "createdAt": "2025-09-22T10:30:00.000Z",
      "startedAt": "2025-09-22T10:35:00.000Z",
      "lastActivity": "2025-09-22T11:00:00.000Z",
      "messageCount": 12,
      "duration": 1500,
      "tags": ["anxiety", "career", "interview"]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalSessions": 25,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "summary": {
    "total": 25,
    "active": 2,
    "waiting": 1,
    "closed": 22
  }
}
```

---

### GET /api/sessions/:sessionId

Get detailed information about a specific session.

**Authentication**: Required  
**Authorization**: User must be participant in session or have counselor/admin role

**Success Response (200)**:
```json
{
  "session": {
    "_id": "60f7b1234567890abcdef124",
    "patientId": {
      "_id": "60f7b1234567890abcdef123",
      "username": "johndoe123",
      "profile": {
        "firstName": "John",
        "preferredName": "Johnny"
      }
    },
    "helperId": {
      "_id": "60f7b1234567890abcdef125",
      "username": "helper_sarah",
      "profile": {
        "firstName": "Sarah",
        "specializations": ["anxiety", "career"],
        "rating": 4.8,
        "sessionsCompleted": 156
      }
    },
    "status": "active",
    "severity": "medium",
    "helperType": "peer",
    "description": "I'm feeling anxious about an upcoming job interview",
    "isAnonymous": false,
    "createdAt": "2025-09-22T10:30:00.000Z",
    "startedAt": "2025-09-22T10:35:00.000Z",
    "endedAt": null,
    "duration": 1500,
    "messageCount": 12,
    "lastActivity": "2025-09-22T11:00:00.000Z",
    "rating": null,
    "feedback": null,
    "sessionNotes": "User is articulate and responding well to peer support techniques",
    "tags": ["anxiety", "career", "interview"],
    "crisisFlags": [],
    "escalationHistory": [],
    "resources": [
      {
        "title": "Interview Anxiety Tips",
        "url": "https://example.com/interview-tips",
        "type": "educational"
      }
    ]
  },
  "recentMessages": [
    {
      "_id": "60f7b1234567890abcdef126",
      "message": "Thank you for sharing that with me. It's completely normal to feel anxious before interviews.",
      "senderId": "60f7b1234567890abcdef125",
      "senderRole": "peer",
      "createdAt": "2025-09-22T11:00:00.000Z"
    }
  ]
}
```

---

### PUT /api/sessions/:sessionId

Update session details (status, rating, feedback, etc.).

**Authentication**: Required  
**Authorization**: User must be participant or have counselor/admin role

**Request Body**:
```json
{
  "status": "closed",
  "rating": 5,
  "feedback": "Sarah was incredibly helpful and understanding. I feel much more confident about my interview now.",
  "sessionNotes": "Successful peer support session. User gained confidence and coping strategies.",
  "tags": ["anxiety", "career", "interview", "resolved"]
}
```

**Success Response (200)**:
```json
{
  "message": "Session updated successfully",
  "session": {
    "_id": "60f7b1234567890abcdef124",
    "status": "closed",
    "rating": 5,
    "feedback": "Sarah was incredibly helpful and understanding...",
    "endedAt": "2025-09-22T11:30:00.000Z",
    "duration": 3600
  }
}
```

---

### POST /api/sessions/:sessionId/join

Join a session as a helper.

**Authentication**: Required  
**Authorization**: User must have peer/counselor role

**Request Body**:
```json
{
  "message": "Hi! I'm here to help and support you through whatever you're experiencing."
}
```

**Success Response (200)**:
```json
{
  "message": "Joined session successfully",
  "session": {
    "_id": "60f7b1234567890abcdef124",
    "status": "active",
    "helperId": "60f7b1234567890abcdef125",
    "startedAt": "2025-09-22T10:35:00.000Z"
  }
}
```

---

## Message Endpoints

### GET /api/messages/:sessionId

Get messages for a specific session with pagination.

**Authentication**: Required  
**Authorization**: User must be participant in session

**Query Parameters**:
- `limit`: Number of messages (default: 50, max: 200)
- `before`: Get messages before this timestamp (ISO string)
- `after`: Get messages after this timestamp (ISO string)
- `messageId`: Get messages before/after this message ID
- `search`: Search within message content

**Success Response (200)**:
```json
{
  "messages": [
    {
      "_id": "60f7b1234567890abcdef126",
      "sessionId": "60f7b1234567890abcdef124",
      "senderId": {
        "_id": "60f7b1234567890abcdef123",
        "username": "johndoe123",
        "profile": {
          "preferredName": "Johnny"
        }
      },
      "message": "I've been feeling really anxious about my job interview tomorrow",
      "senderRole": "patient",
      "messageType": "text",
      "createdAt": "2025-09-22T10:40:00.000Z",
      "updatedAt": "2025-09-22T10:40:00.000Z",
      "replyTo": null,
      "reactions": [
        {
          "userId": "60f7b1234567890abcdef125",
          "reaction": "supportive",
          "createdAt": "2025-09-22T10:41:00.000Z"
        }
      ],
      "crisisDetected": false,
      "aiGenerated": false,
      "isEdited": false,
      "attachments": []
    },
    {
      "_id": "60f7b1234567890abcdef127",
      "sessionId": "60f7b1234567890abcdef124",
      "senderId": {
        "_id": "60f7b1234567890abcdef125",
        "username": "helper_sarah",
        "profile": {
          "firstName": "Sarah"
        }
      },
      "message": "Thank you for sharing that with me. Interview anxiety is completely normal and you're not alone in feeling this way.",
      "senderRole": "peer",
      "messageType": "text",
      "createdAt": "2025-09-22T10:42:00.000Z",
      "replyTo": "60f7b1234567890abcdef126",
      "crisisDetected": false,
      "aiGenerated": false,
      "suggestedResources": [
        {
          "title": "Deep Breathing Exercises",
          "type": "coping-strategy",
          "url": "https://example.com/breathing"
        }
      ]
    }
  ],
  "pagination": {
    "hasMore": true,
    "total": 12,
    "oldestMessageId": "60f7b1234567890abcdef126",
    "newestMessageId": "60f7b1234567890abcdef127"
  },
  "sessionInfo": {
    "status": "active",
    "participants": 2,
    "crisisFlags": 0
  }
}
```

---

### POST /api/messages

Send a message to a session (alternative to Socket.io).

**Authentication**: Required

**Request Body**:
```json
{
  "sessionId": "60f7b1234567890abcdef124",
  "message": "That really helps, thank you. Can you tell me more about breathing exercises?",
  "messageType": "text",
  "replyTo": "60f7b1234567890abcdef127",
  "attachments": []
}
```

**For file/image messages**:
```json
{
  "sessionId": "60f7b1234567890abcdef124",
  "message": "Here's a photo that helps me feel calm",
  "messageType": "image",
  "attachments": [
    {
      "url": "https://cloudinary.com/...",
      "type": "image",
      "filename": "calming-photo.jpg",
      "size": 245760
    }
  ]
}
```

**Success Response (201)**:
```json
{
  "message": "Message sent successfully",
  "messageData": {
    "_id": "60f7b1234567890abcdef128",
    "sessionId": "60f7b1234567890abcdef124",
    "senderId": "60f7b1234567890abcdef123",
    "message": "That really helps, thank you. Can you tell me more about breathing exercises?",
    "senderRole": "patient",
    "messageType": "text",
    "createdAt": "2025-09-22T10:45:00.000Z",
    "replyTo": {
      "_id": "60f7b1234567890abcdef127",
      "message": "Thank you for sharing that with me..."
    },
    "crisisDetected": false,
    "aiAnalysis": {
      "intent": "seeking-information",
      "sentiment": "positive",
      "urgency": "low"
    }
  },
  "aiSuggestions": [
    {
      "type": "resource",
      "title": "4-7-8 Breathing Technique",
      "description": "A simple breathing exercise to reduce anxiety"
    }
  ]
}
```

---

### PUT /api/messages/:messageId

Edit a previously sent message.

**Authentication**: Required  
**Authorization**: User must be the sender

**Request Body**:
```json
{
  "message": "That really helps, thank you so much. Can you tell me more about breathing exercises?"
}
```

**Success Response (200)**:
```json
{
  "message": "Message updated successfully",
  "messageData": {
    "_id": "60f7b1234567890abcdef128",
    "message": "That really helps, thank you so much. Can you tell me more about breathing exercises?",
    "isEdited": true,
    "editedAt": "2025-09-22T10:47:00.000Z"
  }
}
```

---

### DELETE /api/messages/:messageId

Delete a message (soft delete for audit purposes).

**Authentication**: Required  
**Authorization**: User must be sender or have admin role

**Success Response (200)**:
```json
{
  "message": "Message deleted successfully"
}
```

---

## Crisis Management

### POST /api/crisis/alert

Create a crisis alert when crisis indicators are detected.

**Authentication**: Required

**Request Body**:
```json
{
  "severity": "high",
  "type": "self-harm-indication",
  "description": "User expressed thoughts of self-harm in session",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "New York, NY",
    "accuracy": 100
  },
  "sessionId": "60f7b1234567890abcdef124",
  "triggerMessage": "I just don't see the point in continuing anymore",
  "detectionMethod": "keyword-analysis",
  "riskFactors": [
    "expressed-hopelessness",
    "social-isolation",
    "previous-attempts"
  ]
}
```

**Field Descriptions**:
- `severity`: `medium` | `high` | `critical`
- `type`: `self-harm-indication` | `suicide-risk` | `immediate-danger` | `user-report`

**Success Response (201)**:
```json
{
  "message": "Crisis alert created successfully",
  "alert": {
    "_id": "60f7b1234567890abcdef129",
    "userId": "60f7b1234567890abcdef123",
    "sessionId": "60f7b1234567890abcdef124",
    "severity": "high",
    "type": "self-harm-indication",
    "status": "active",
    "description": "User expressed thoughts of self-harm in session",
    "createdAt": "2025-09-22T10:50:00.000Z",
    "assignedCounselorId": "60f7b1234567890abcdef130",
    "estimatedResponseTime": 300,
    "alertNumber": "CA-2025-001234"
  },
  "immediateActions": [
    {
      "action": "counselor-notified",
      "status": "completed",
      "timestamp": "2025-09-22T10:50:00.000Z"
    },
    {
      "action": "session-escalated",
      "status": "in-progress",
      "timestamp": "2025-09-22T10:50:05.000Z"
    }
  ],
  "emergencyContacts": {
    "crisis": "988",
    "text": "Text HOME to 741741",
    "emergency": "911",
    "local": {
      "name": "NYC Crisis Hotline",
      "phone": "1-888-NYC-WELL"
    }
  },
  "resources": [
    {
      "title": "Crisis Text Line",
      "description": "Free, 24/7 crisis support via text",
      "contact": "Text HOME to 741741",
      "type": "immediate"
    },
    {
      "title": "National Suicide Prevention Lifeline",
      "description": "Free, confidential support 24/7",
      "contact": "988",
      "type": "immediate"
    }
  ]
}
```

---

### GET /api/crisis/alerts

Get crisis alerts (restricted to counselors and admins).

**Authentication**: Required  
**Authorization**: Counselor or Admin role

**Query Parameters**:
- `status`: Filter by status (`active`, `resolved`, `escalated`)
- `severity`: Filter by severity (`medium`, `high`, `critical`)
- `assignedTo`: Filter by assigned counselor ID
- `limit`: Number of alerts (default: 20)
- `page`: Page number (default: 1)
- `dateFrom`: Start date filter
- `dateTo`: End date filter

**Success Response (200)**:
```json
{
  "alerts": [
    {
      "_id": "60f7b1234567890abcdef129",
      "user": {
        "_id": "60f7b1234567890abcdef123",
        "username": "johndoe123",
        "profile": {
          "firstName": "John",
          "age": 25
        }
      },
      "session": {
        "_id": "60f7b1234567890abcdef124",
        "status": "escalated"
      },
      "severity": "high",
      "type": "self-harm-indication",
      "status": "active",
      "description": "User expressed thoughts of self-harm in session",
      "createdAt": "2025-09-22T10:50:00.000Z",
      "assignedCounselor": {
        "_id": "60f7b1234567890abcdef130",
        "profile": {
          "firstName": "Dr. Smith"
        }
      },
      "responseTime": null,
      "resolution": null,
      "alertNumber": "CA-2025-001234",
      "riskLevel": "high",
      "followUpRequired": true
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalAlerts": 89
  },
  "summary": {
    "active": 12,
    "resolved": 76,
    "critical": 1,
    "averageResponseTime": 180
  }
}
```

---

### PUT /api/crisis/alerts/:alertId

Update crisis alert status and resolution.

**Authentication**: Required  
**Authorization**: Assigned counselor, admin, or crisis team

**Request Body**:
```json
{
  "status": "resolved",
  "resolution": "User connected with local crisis counselor. Safety plan established. Follow-up scheduled for tomorrow.",
  "actionsTaken": [
    "Immediate phone contact established",
    "Safety plan created with user",
    "Local crisis center notified",
    "Follow-up appointment scheduled"
  ],
  "riskAssessment": "Risk significantly reduced after intervention",
  "followUpRequired": true,
  "followUpDate": "2025-09-23T10:00:00.000Z",
  "notes": "User was responsive to intervention and engaged in safety planning"
}
```

**Success Response (200)**:
```json
{
  "message": "Crisis alert updated successfully",
  "alert": {
    "_id": "60f7b1234567890abcdef129",
    "status": "resolved",
    "resolution": "User connected with local crisis counselor...",
    "resolvedAt": "2025-09-22T11:20:00.000Z",
    "responseTime": 1800,
    "resolvedBy": "60f7b1234567890abcdef130"
  }
}
```

---

### GET /api/crisis/resources

Get crisis resources and emergency contacts.

**Authentication**: Not required

**Query Parameters**:
- `location`: Get location-specific resources (lat,lng)
- `type`: Filter by resource type (`hotline`, `text`, `local`, `educational`)

**Success Response (200)**:
```json
{
  "emergency": {
    "title": "Emergency Services",
    "phone": "911",
    "description": "For immediate life-threatening emergencies"
  },
  "crisis": [
    {
      "title": "988 Suicide & Crisis Lifeline",
      "phone": "988",
      "text": null,
      "website": "https://988lifeline.org",
      "description": "Free, confidential support 24/7 for people in distress",
      "available": "24/7",
      "languages": ["en", "es"]
    },
    {
      "title": "Crisis Text Line",
      "phone": null,
      "text": "Text HOME to 741741",
      "website": "https://crisistextline.org",
      "description": "Free, 24/7 crisis support via text message",
      "available": "24/7"
    }
  ],
  "local": [
    {
      "title": "NYC Well",
      "phone": "1-888-692-9355",
      "text": "Text WELL to 65173",
      "description": "New York City's free, confidential mental health support",
      "location": "New York, NY"
    }
  ],
  "specialized": [
    {
      "title": "LGBTQ National Hotline",
      "phone": "1-888-843-4564",
      "description": "Support for LGBTQ youth and adults",
      "population": "LGBTQ+"
    },
    {
      "title": "Veterans Crisis Line",
      "phone": "1-800-273-8255",
      "text": "Text 838255",
      "description": "Crisis support for veterans and their families",
      "population": "Veterans"
    }
  ]
}
```

---

## AI/Chatbot Endpoints

### POST /api/ai/chat

Interact with the AI mental health assistant.

**Authentication**: Required

**Request Body**:
```json
{
  "message": "I've been feeling really anxious lately and I don't know how to cope",
  "sessionId": "60f7b1234567890abcdef124",
  "context": {
    "previousMessages": [
      {
        "role": "user",
        "content": "Hello, I need some help",
        "timestamp": "2025-09-22T10:40:00.000Z"
      },
      {
        "role": "assistant", 
        "content": "Hi there! I'm here to support you. What's been on your mind?",
        "timestamp": "2025-09-22T10:40:30.000Z"
      }
    ],
    "userProfile": {
      "age": 25,
      "previousSessions": 3,
      "preferences": {
        "communicationStyle": "supportive",
        "topicsOfConcern": ["anxiety", "work-stress"]
      }
    }
  },
  "options": {
    "includeResources": true,
    "generateSuggestions": true,
    "crisisDetection": true
  }
}
```

**Success Response (200)**:
```json
{
  "response": {
    "text": "I hear that you're feeling anxious, and I want you to know that reaching out shows real strength. Anxiety can feel overwhelming, but there are effective ways to manage it. Would you like to try a quick breathing exercise together, or would you prefer to talk about what's been triggering these feelings?",
    "type": "supportive-response",
    "intent": "anxiety-support",
    "suggestions": [
      "Try a breathing exercise",
      "Explore anxiety triggers", 
      "Learn grounding techniques",
      "Connect with a peer counselor"
    ],
    "escalationNeeded": false,
    "resources": [
      {
        "title": "4-7-8 Breathing Technique",
        "url": "https://example.com/breathing-technique",
        "type": "coping-strategy",
        "description": "A simple breathing exercise to reduce anxiety in the moment"
      },
      {
        "title": "Understanding Anxiety",
        "url": "https://example.com/anxiety-info",
        "type": "educational",
        "description": "Learn about anxiety symptoms and management strategies"
      }
    ],
    "followUpQuestions": [
      "What situations tend to trigger your anxiety?",
      "Have you tried any coping strategies before?",
      "Would you like to explore some grounding techniques?"
    ]
  },
  "metadata": {
    "confidence": 0.92,
    "intent": "anxiety-support",
    "sentiment": "concerned-but-hopeful",
    "crisisDetected": false,
    "riskLevel": "low",
    "responseTime": 1.2,
    "model": "azure-openai-gpt4",
    "conversationId": "conv_60f7b1234567890abcdef131"
  },
  "analytics": {
    "userEngagement": "high",
    "topicProgression": "appropriate",
    "supportLevel": "peer-appropriate"
  }
}
```

**Crisis Detection Response (200)**:
```json
{
  "response": {
    "text": "I'm really concerned about what you're going through right now, and I want you to know that you don't have to face this alone. Your safety is the most important thing. I'm connecting you with a crisis counselor immediately who can provide the support you need.",
    "type": "crisis-response",
    "escalationNeeded": true,
    "immediateActions": [
      "Crisis counselor notification sent",
      "Session escalated to critical priority",
      "Emergency contacts prepared"
    ]
  },
  "emergencyContacts": {
    "crisis": "988",
    "text": "Text HOME to 741741",
    "emergency": "911"
  },
  "metadata": {
    "crisisDetected": true,
    "riskLevel": "high",
    "alertCreated": "60f7b1234567890abcdef129"
  }
}
```

---

### POST /api/chatbot/session

Start a dedicated chatbot session.

**Authentication**: Required

**Request Body**:
```json
{
  "isAnonymous": false,
  "initialMessage": "Hi, I'm having a difficult day and could use some support",
  "preferences": {
    "language": "en",
    "communicationStyle": "gentle",
    "sessionGoals": ["emotional-support", "coping-strategies"]
  },
  "context": {
    "currentMood": "anxious",
    "urgency": "medium"
  }
}
```

**Success Response (201)**:
```json
{
  "message": "Chatbot session created successfully",
  "session": {
    "_id": "60f7b1234567890abcdef132",
    "userId": "60f7b1234567890abcdef123",
    "type": "chatbot",
    "status": "active",
    "isAnonymous": false,
    "createdAt": "2025-09-22T11:00:00.000Z",
    "conversationId": "conv_60f7b1234567890abcdef133"
  },
  "initialResponse": {
    "text": "Hello! I'm glad you reached out, especially on a difficult day. That takes courage. I'm here to listen and support you through whatever you're experiencing. You mentioned you could use some support - would you like to share what's been making today particularly challenging?",
    "suggestions": [
      "Tell me about your day",
      "I need coping strategies",
      "I'm feeling overwhelmed",
      "Connect me with a human counselor"
    ]
  }
}
```

---

### GET /api/chatbot/sessions/:sessionId/history

Get conversation history for a chatbot session.

**Authentication**: Required

**Success Response (200)**:
```json
{
  "conversation": [
    {
      "role": "user",
      "content": "Hi, I'm having a difficult day and could use some support",
      "timestamp": "2025-09-22T11:00:00.000Z",
      "intent": "seeking-support"
    },
    {
      "role": "assistant",
      "content": "Hello! I'm glad you reached out, especially on a difficult day...",
      "timestamp": "2025-09-22T11:00:15.000Z",
      "resources": [
        {
          "title": "Daily Coping Strategies",
          "type": "educational"
        }
      ]
    }
  ],
  "sessionInfo": {
    "startedAt": "2025-09-22T11:00:00.000Z",
    "duration": 1200,
    "messageCount": 24,
    "topics": ["anxiety", "coping-strategies", "self-care"],
    "escalations": 0
  }
}
```

---

## Urgent Operations

### POST /api/urgent/escalate

Escalate a session to higher priority or different helper type.

**Authentication**: Required

**Request Body**:
```json
{
  "sessionId": "60f7b1234567890abcdef124",
  "newSeverity": "critical",
  "reason": "User expressed suicidal ideation - immediate professional intervention required",
  "targetHelperType": "counselor",
  "notes": "User mentioned specific plan and means. Requires immediate crisis assessment.",
  "requestedCounselorId": "60f7b1234567890abcdef134"
}
```

**Success Response (200)**:
```json
{
  "message": "Session escalated successfully",
  "escalation": {
    "_id": "60f7b1234567890abcdef135",
    "sessionId": "60f7b1234567890abcdef124",
    "escalatedBy": "60f7b1234567890abcdef125",
    "escalatedTo": "counselor",
    "previousSeverity": "medium",
    "newSeverity": "critical",
    "reason": "User expressed suicidal ideation...",
    "createdAt": "2025-09-22T11:15:00.000Z",
    "estimatedResponseTime": 120,
    "priority": 1
  },
  "session": {
    "_id": "60f7b1234567890abcdef124",
    "status": "escalated",
    "severity": "critical",
    "helperType": "counselor",
    "queuePosition": 1
  },
  "notifications": {
    "crisisTeamAlerted": true,
    "counselorAssigned": "60f7b1234567890abcdef134",
    "supervisorNotified": true
  }
}
```

---

### POST /api/urgent/crisis-intervention

Request immediate crisis intervention.

**Authentication**: Required

**Request Body**:
```json
{
  "sessionId": "60f7b1234567890abcdef124",
  "interventionType": "suicide-risk",
  "immediacy": "critical",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "123 Main St, New York, NY"
  },
  "contactInfo": {
    "phone": "+1234567890",
    "emergencyContact": {
      "name": "Jane Doe",
      "relationship": "Sister",
      "phone": "+1234567891"
    }
  },
  "situation": "User has expressed intent to self-harm and has means available",
  "requestedActions": ["immediate-counselor", "local-emergency-services"]
}
```

**Success Response (200)**:
```json
{
  "message": "Crisis intervention initiated",
  "intervention": {
    "_id": "60f7b1234567890abcdef136",
    "sessionId": "60f7b1234567890abcdef124",
    "type": "suicide-risk",
    "status": "active",
    "createdAt": "2025-09-22T11:20:00.000Z",
    "assignedCrisisWorker": "60f7b1234567890abcdef137",
    "estimatedContact": "2025-09-22T11:22:00.000Z",
    "caseNumber": "CI-2025-001235"
  },
  "immediateActions": [
    {
      "action": "crisis-counselor-assigned",
      "status": "completed",
      "timestamp": "2025-09-22T11:20:05.000Z"
    },
    {
      "action": "local-services-contacted",
      "status": "in-progress", 
      "estimatedCompletion": "2025-09-22T11:25:00.000Z"
    }
  ],
  "contacts": {
    "assignedWorker": {
      "name": "Crisis Counselor Maria",
      "phone": "+1-800-CRISIS-1",
      "expectedContact": "within 2 minutes"
    }
  }
}
```

---

## Socket.io Events

### Connection

```javascript
// Client connects with authentication
socket.emit('authenticate', {
  token: 'jwt_token_here'
});

// Server confirms authentication
socket.on('authenticated', (userData) => {
  console.log('Connected as:', userData.username);
});
```

### Session Events

#### join-session
**Client to Server**:
```javascript
socket.emit('join-session', {
  sessionId: '60f7b1234567890abcdef124'
});
```

**Server Response**:
```javascript
socket.on('session-joined', {
  sessionId: '60f7b1234567890abcdef124',
  participants: [
    {
      userId: '60f7b1234567890abcdef123',
      username: 'johndoe123',
      role: 'patient',
      joinedAt: '2025-09-22T11:00:00.000Z'
    }
  ],
  status: 'active'
});
```

#### leave-session
**Client to Server**:
```javascript
socket.emit('leave-session', {
  sessionId: '60f7b1234567890abcdef124'
});
```

### Message Events

#### send-message
**Client to Server**:
```javascript
socket.emit('send-message', {
  sessionId: '60f7b1234567890abcdef124',
  message: 'Thank you for your help, I feel much better now',
  messageType: 'text',
  replyTo: '60f7b1234567890abcdef127'
});
```

**Server to All Session Participants**:
```javascript
socket.on('new-message', {
  _id: '60f7b1234567890abcdef140',
  sessionId: '60f7b1234567890abcdef124',
  senderId: {
    _id: '60f7b1234567890abcdef123',
    username: 'johndoe123',
    profile: {
      preferredName: 'Johnny'
    }
  },
  message: 'Thank you for your help, I feel much better now',
  senderRole: 'patient',
  messageType: 'text',
  createdAt: '2025-09-22T11:30:00.000Z',
  replyTo: {
    _id: '60f7b1234567890abcdef127',
    message: 'Remember, you have the strength to get through this'
  },
  crisisDetected: false
});
```

#### typing-indicator
**Client to Server**:
```javascript
socket.emit('typing-indicator', {
  sessionId: '60f7b1234567890abcdef124',
  isTyping: true
});
```

**Server to Other Session Participants**:
```javascript
socket.on('user-typing', {
  sessionId: '60f7b1234567890abcdef124',
  userId: '60f7b1234567890abcdef123',
  username: 'johndoe123',
  isTyping: true
});
```

### Crisis Events

#### crisis-alert
**Client to Server**:
```javascript
socket.emit('crisis-alert', {
  severity: 'high',
  description: 'User expressed thoughts of self-harm',
  sessionId: '60f7b1234567890abcdef124',
  location: {
    latitude: 40.7128,
    longitude: -74.0060
  }
});
```

**Server to Crisis Team**:
```javascript
socket.on('crisis-alert', {
  alertId: '60f7b1234567890abcdef129',
  userId: '60f7b1234567890abcdef123',
  sessionId: '60f7b1234567890abcdef124',
  severity: 'high',
  type: 'self-harm-indication',
  description: 'User expressed thoughts of self-harm',
  createdAt: '2025-09-22T11:35:00.000Z',
  location: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  estimatedResponseTime: 300
});
```

#### session-escalated
**Server to Session Participants**:
```javascript
socket.on('session-escalated', {
  sessionId: '60f7b1234567890abcdef124',
  escalatedBy: '60f7b1234567890abcdef125',
  newSeverity: 'critical',
  newHelperType: 'counselor',
  reason: 'Crisis indicators detected',
  estimatedResponseTime: 120
});
```

### System Events

#### user-joined-session
**Server to Session Participants**:
```javascript
socket.on('user-joined-session', {
  sessionId: '60f7b1234567890abcdef124',
  user: {
    _id: '60f7b1234567890abcdef125',
    username: 'helper_sarah',
    role: 'peer',
    profile: {
      firstName: 'Sarah'
    }
  },
  joinedAt: '2025-09-22T11:40:00.000Z'
});
```

#### user-left-session
**Server to Session Participants**:
```javascript
socket.on('user-left-session', {
  sessionId: '60f7b1234567890abcdef124',
  userId: '60f7b1234567890abcdef125',
  leftAt: '2025-09-22T12:00:00.000Z',
  reason: 'session-completed'
});
```

#### session-status-updated
**Server to Session Participants**:
```javascript
socket.on('session-status-updated', {
  sessionId: '60f7b1234567890abcdef124',
  oldStatus: 'active',
  newStatus: 'closed',
  updatedBy: '60f7b1234567890abcdef123',
  timestamp: '2025-09-22T12:00:00.000Z'
});
```

---

## Examples

### Complete User Registration Flow

```javascript
// 1. Register user
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'johndoe123',
    email: 'john.doe@example.com',
    password: 'SecurePassword123!',
    role: 'patient',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      age: 25,
      preferredName: 'Johnny'
    },
    agreedToTerms: true,
    agreedToPrivacy: true
  })
});

const { user, token } = await registerResponse.json();

// 2. Create a session
const sessionResponse = await fetch('/api/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    helperType: 'peer',
    severity: 'medium',
    description: 'Feeling anxious about job interview',
    isAnonymous: false,
    preferences: {
      ageRange: '20-30',
      gender: 'any',
      language: 'en'
    }
  })
});

const { session } = await sessionResponse.json();

// 3. Connect to Socket.io
const socket = io('http://localhost:5000', {
  auth: {
    token: token
  }
});

// 4. Join session
socket.emit('join-session', {
  sessionId: session._id
});

// 5. Send message
socket.emit('send-message', {
  sessionId: session._id,
  message: 'Hi, I\'m really nervous about my interview tomorrow',
  messageType: 'text'
});
```

### Crisis Intervention Flow

```javascript
// 1. AI detects crisis keywords in message
const aiResponse = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    message: 'I just can\'t take this anymore, I want to end it all',
    sessionId: session._id
  })
});

const aiData = await aiResponse.json();

// 2. If crisis detected, system automatically creates alert
if (aiData.metadata.crisisDetected) {
  // Alert is automatically created by the system
  console.log('Crisis alert created:', aiData.metadata.alertCreated);
}

// 3. Manual crisis alert can also be created
const crisisResponse = await fetch('/api/crisis/alert', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    severity: 'critical',
    type: 'suicide-risk',
    description: 'User expressed intent to end their life',
    sessionId: session._id,
    triggerMessage: 'I just can\'t take this anymore, I want to end it all'
  })
});

// 4. Crisis team receives real-time notification via Socket.io
socket.on('crisis-alert', (alertData) => {
  console.log('Crisis alert received:', alertData);
  // Crisis team takes immediate action
});
```

### Helper Joining Session Flow

```javascript
// Helper views available sessions
const availableSessionsResponse = await fetch('/api/sessions?status=waiting&helperType=peer', {
  headers: {
    'Authorization': `Bearer ${helperToken}`
  }
});

const { sessions } = await availableSessionsResponse.json();

// Helper joins a session
const joinResponse = await fetch(`/api/sessions/${sessionId}/join`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${helperToken}`
  },
  body: JSON.stringify({
    message: 'Hi! I\'m here to help and support you through whatever you\'re experiencing.'
  })
});

// Connect to Socket.io and join session
const helperSocket = io('http://localhost:5000', {
  auth: { token: helperToken }
});

helperSocket.emit('join-session', { sessionId });

// Listen for messages
helperSocket.on('new-message', (messageData) => {
  console.log('New message:', messageData);
});
```

---

## Response Codes Summary

| Code | Description | Usage |
|------|-------------|--------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST operations |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side errors |

---

*This documentation covers all available endpoints in the Saneyar Mental Health Platform API. For additional support or questions, please contact the development team.*
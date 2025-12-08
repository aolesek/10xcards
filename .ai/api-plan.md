# REST API Plan for 10xCards

## 1. Resources

### Core Resources

| Resource | Database Table | Description |
|----------|---------------|-------------|
| **User** | `users` | User accounts with authentication credentials and AI usage limits |
| **Deck** | `decks` | Collections of flashcards organized by users |
| **Flashcard** | `flashcards` | Individual flashcards with front/back content and source tracking |
| **AIGeneration** | `ai_generations` | AI generation sessions with candidate flashcards and review state |

## 2. API Endpoints

### 2.1. Authentication & User Management

#### Register New User
- **Method:** `POST`
- **Path:** `/api/auth/register`
- **Description:** Create a new user account
- **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```
- **Success Response:** `201 Created`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "USER",
  "monthlyAiLimit": 100,
  "aiUsageInCurrentMonth": 0,
  "accessToken": "jwt-token",
  "refreshToken": "jwt-refresh-token"
}
```
- **Error Responses:**
  - `400 Bad Request` - Invalid email format or password requirements not met
  - `409 Conflict` - Email already exists

#### Login
- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Description:** Authenticate user and receive JWT tokens
- **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```
- **Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "USER",
  "monthlyAiLimit": 100,
  "aiUsageInCurrentMonth": 45,
  "accessToken": "jwt-token",
  "refreshToken": "jwt-refresh-token"
}
```
- **Error Responses:**
  - `401 Unauthorized` - Invalid credentials
  - `429 Too Many Requests` - Rate limit exceeded (5 attempts per 15 minutes)

#### Refresh Token
- **Method:** `POST`
- **Path:** `/api/auth/refresh`
- **Description:** Refresh access token using refresh token
- **Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```
- **Success Response:** `200 OK`
```json
{
  "accessToken": "new-jwt-token",
  "refreshToken": "new-jwt-refresh-token"
}
```
- **Error Responses:**
  - `401 Unauthorized` - Invalid or expired refresh token

#### Logout
- **Method:** `POST`
- **Path:** `/api/auth/logout`
- **Description:** Invalidate current session
- **Headers:** `Authorization: Bearer {token}`
- **Success Response:** `204 No Content`

#### Request Password Reset
- **Method:** `POST`
- **Path:** `/api/auth/password-reset/request`
- **Description:** Request password reset token via email
- **Request Body:**
```json
{
  "email": "user@example.com"
}
```
- **Success Response:** `200 OK`
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```
- **Error Responses:**
  - `429 Too Many Requests` - Rate limit exceeded (3 requests per hour per email)

#### Reset Password
- **Method:** `POST`
- **Path:** `/api/auth/password-reset/confirm`
- **Description:** Reset password using token from email
- **Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```
- **Success Response:** `200 OK`
```json
{
  "message": "Password has been reset successfully."
}
```
- **Error Responses:**
  - `400 Bad Request` - Invalid token or password requirements not met
  - `410 Gone` - Token expired (after 24 hours)

#### Get Current User Profile
- **Method:** `GET`
- **Path:** `/api/users/me`
- **Description:** Retrieve current authenticated user's profile
- **Headers:** `Authorization: Bearer {token}`
- **Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "USER",
  "monthlyAiLimit": 100,
  "aiUsageInCurrentMonth": 45,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-20T14:45:00Z"
}
```
- **Error Responses:**
  - `401 Unauthorized` - Invalid or missing token

### 2.2. Deck Management

#### List User's Decks
- **Method:** `GET`
- **Path:** `/api/decks`
- **Description:** Get all decks owned by authenticated user
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:**
  - `page` (optional, default: 0) - Page number for pagination
  - `size` (optional, default: 20) - Number of items per page
  - `sort` (optional, default: "createdAt,desc") - Sort field and direction
- **Success Response:** `200 OK`
```json
{
  "content": [
    {
      "id": "uuid",
      "name": "Biology 101",
      "flashcardCount": 45,
      "createdAt": "2025-01-10T09:00:00Z",
      "updatedAt": "2025-01-15T14:30:00Z"
    }
  ],
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```
- **Error Responses:**
  - `401 Unauthorized` - Invalid or missing token

#### Get Single Deck
- **Method:** `GET`
- **Path:** `/api/decks/{deckId}`
- **Description:** Get details of a specific deck
- **Headers:** `Authorization: Bearer {token}`
- **Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "Biology 101",
  "flashcardCount": 45,
  "createdAt": "2025-01-10T09:00:00Z",
  "updatedAt": "2025-01-15T14:30:00Z"
}
```
- **Error Responses:**
  - `401 Unauthorized` - Invalid or missing token
  - `403 Forbidden` - Deck belongs to another user
  - `404 Not Found` - Deck does not exist

#### Create New Deck
- **Method:** `POST`
- **Path:** `/api/decks`
- **Description:** Create a new deck
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "name": "Biology 101"
}
```
- **Success Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Biology 101",
  "flashcardCount": 0,
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-20T10:00:00Z"
}
```
- **Error Responses:**
  - `400 Bad Request` - Name is empty after trimming or exceeds 100 characters
  - `401 Unauthorized` - Invalid or missing token
  - `409 Conflict` - Deck with this name already exists for user

#### Update Deck
- **Method:** `PUT`
- **Path:** `/api/decks/{deckId}`
- **Description:** Update deck name
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "name": "Advanced Biology"
}
```
- **Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "Advanced Biology",
  "flashcardCount": 45,
  "createdAt": "2025-01-10T09:00:00Z",
  "updatedAt": "2025-01-20T11:00:00Z"
}
```
- **Error Responses:**
  - `400 Bad Request` - Name is empty after trimming or exceeds 100 characters
  - `401 Unauthorized` - Invalid or missing token
  - `403 Forbidden` - Deck belongs to another user
  - `404 Not Found` - Deck does not exist
  - `409 Conflict` - Another deck with this name already exists for user

#### Delete Deck
- **Method:** `DELETE`
- **Path:** `/api/decks/{deckId}`
- **Description:** Delete deck and all associated flashcards (CASCADE)
- **Headers:** `Authorization: Bearer {token}`
- **Success Response:** `204 No Content`
- **Error Responses:**
  - `401 Unauthorized` - Invalid or missing token
  - `403 Forbidden` - Deck belongs to another user
  - `404 Not Found` - Deck does not exist

### 2.3. Flashcard Management

#### List Flashcards in Deck
- **Method:** `GET`
- **Path:** `/api/decks/{deckId}/flashcards`
- **Description:** Get all flashcards in a specific deck
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:**
  - `page` (optional, default: 0) - Page number for pagination
  - `size` (optional, default: 50) - Number of items per page
  - `sort` (optional, default: "createdAt,desc") - Sort field and direction
  - `source` (optional) - Filter by source: "manual", "ai", "ai-edited"
- **Success Response:** `200 OK`
```json
{
  "content": [
    {
      "id": "uuid",
      "front": "What is photosynthesis?",
      "back": "The process by which plants convert light energy into chemical energy",
      "source": "ai",
      "generationId": "uuid",
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "page": {
    "number": 0,
    "size": 50,
    "totalElements": 45,
    "totalPages": 1
  }
}
```
- **Error Responses:**
  - `401 Unauthorized` - Invalid or missing token
  - `403 Forbidden` - Deck belongs to another user
  - `404 Not Found` - Deck does not exist

#### Get Single Flashcard
- **Method:** `GET`
- **Path:** `/api/flashcards/{flashcardId}`
- **Description:** Get details of a specific flashcard
- **Headers:** `Authorization: Bearer {token}`
- **Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "deckId": "uuid",
  "front": "What is photosynthesis?",
  "back": "The process by which plants convert light energy into chemical energy",
  "source": "ai",
  "generationId": "uuid",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```
- **Error Responses:**
  - `401 Unauthorized` - Invalid or missing token
  - `403 Forbidden` - Flashcard belongs to deck of another user
  - `404 Not Found` - Flashcard does not exist

#### Create Manual Flashcard
- **Method:** `POST`
- **Path:** `/api/decks/{deckId}/flashcards`
- **Description:** Create a new flashcard manually
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "front": "What is mitosis?",
  "back": "Cell division process that produces two identical daughter cells"
}
```
- **Success Response:** `201 Created`
```json
{
  "id": "uuid",
  "front": "What is mitosis?",
  "back": "Cell division process that produces two identical daughter cells",
  "source": "manual",
  "generationId": null,
  "createdAt": "2025-01-20T12:00:00Z",
  "updatedAt": "2025-01-20T12:00:00Z"
}
```
- **Error Responses:**
  - `400 Bad Request` - Front or back is empty after trimming or exceeds 500 characters
  - `401 Unauthorized` - Invalid or missing token
  - `403 Forbidden` - Deck belongs to another user
  - `404 Not Found` - Deck does not exist

#### Update Flashcard
- **Method:** `PUT`
- **Path:** `/api/flashcards/{flashcardId}`
- **Description:** Update an existing flashcard
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "front": "What is mitosis? (Updated)",
  "back": "Cell division process that produces two genetically identical daughter cells from one parent cell"
}
```
- **Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "deckId": "uuid",
  "front": "What is mitosis? (Updated)",
  "back": "Cell division process that produces two genetically identical daughter cells from one parent cell",
  "source": "ai-edited",
  "generationId": "uuid",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-20T12:30:00Z"
}
```
- **Error Responses:**
  - `400 Bad Request` - Front or back is empty after trimming or exceeds 500 characters
  - `401 Unauthorized` - Invalid or missing token
  - `403 Forbidden` - Flashcard belongs to deck of another user
  - `404 Not Found` - Flashcard does not exist

**Note:** If the flashcard source is "ai", it will be changed to "ai-edited". If source is "manual", it remains "manual".

#### Delete Flashcard
- **Method:** `DELETE`
- **Path:** `/api/flashcards/{flashcardId}`
- **Description:** Delete a single flashcard
- **Headers:** `Authorization: Bearer {token}`
- **Success Response:** `204 No Content`
- **Error Responses:**
  - `401 Unauthorized` - Invalid or missing token
  - `403 Forbidden` - Flashcard belongs to deck of another user
  - `404 Not Found` - Flashcard does not exist

### 2.4. AI Generation

#### Generate Flashcard Candidates
- **Method:** `POST`
- **Path:** `/api/ai/generate`
- **Description:** Generate flashcard candidates from source text using AI
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "deckId": "uuid",
  "sourceText": "Photosynthesis is a process used by plants... [500-10000 chars]"
}
```
- **Success Response:** `201 Created`
```json
{
  "id": "uuid",
  "deckId": "uuid",
  "aiModel": "openai/gpt-4",
  "sourceTextHash": "sha256-hash",
  "sourceTextLength": 1523,
  "generatedCandidatesCount": 8,
  "candidates": [
    {
      "id": "candidate-uuid-1",
      "front": "What is photosynthesis?",
      "back": "The process by which plants convert light energy into chemical energy",
      "status": "pending",
      "editedFront": null,
      "editedBack": null
    }
  ],
  "createdAt": "2025-01-20T13:00:00Z",
  "updatedAt": "2025-01-20T13:00:00Z"
}
```
- **Error Responses:**
  - `400 Bad Request` - Source text length not in range 500-10000 characters
  - `401 Unauthorized` - Invalid or missing token
  - `403 Forbidden` - Deck belongs to another user or monthly AI limit exceeded
  - `404 Not Found` - Deck does not exist
  - `429 Too Many Requests` - Rate limit exceeded
  - `503 Service Unavailable` - AI service temporarily unavailable

#### Get AI Generation Session
- **Method:** `GET`
- **Path:** `/api/ai/generations/{generationId}`
- **Description:** Retrieve AI generation session with current candidate states
- **Headers:** `Authorization: Bearer {token}`
- **Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "deckId": "uuid",
  "aiModel": "openai/gpt-4",
  "sourceTextHash": "sha256-hash",
  "sourceTextLength": 1523,
  "generatedCandidatesCount": 8,
  "candidates": [
    {
      "id": "candidate-uuid-1",
      "front": "What is photosynthesis?",
      "back": "The process by which plants convert light energy into chemical energy",
      "status": "accepted",
      "editedFront": null,
      "editedBack": null
    },
    {
      "id": "candidate-uuid-2",
      "front": "What is chlorophyll?",
      "back": "The green pigment in plants",
      "status": "edited",
      "editedFront": "What is chlorophyll and what does it do?",
      "editedBack": "The green pigment in plants that absorbs light for photosynthesis"
    },
    {
      "id": "candidate-uuid-3",
      "front": "Bad question",
      "back": "Bad answer",
      "status": "rejected",
      "editedFront": null,
      "editedBack": null
    }
  ],
  "createdAt": "2025-01-20T13:00:00Z",
  "updatedAt": "2025-01-20T13:15:00Z"
}
```
- **Error Responses:**
  - `401 Unauthorized` - Invalid or missing token
  - `403 Forbidden` - Generation belongs to another user
  - `404 Not Found` - Generation does not exist

#### Update Candidate Status
- **Method:** `PATCH`
- **Path:** `/api/ai/generations/{generationId}/candidates`
- **Description:** Update status of candidates (accept, reject, edit)
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "candidates": [
    {
      "id": "candidate-uuid-1",
      "status": "accepted"
    },
    {
      "id": "candidate-uuid-2",
      "status": "edited",
      "editedFront": "What is chlorophyll and what does it do?",
      "editedBack": "The green pigment in plants that absorbs light for photosynthesis"
    },
    {
      "id": "candidate-uuid-3",
      "status": "rejected"
    }
  ]
}
```
- **Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "updatedCandidatesCount": 3,
  "updatedAt": "2025-01-20T13:15:00Z"
}
```
- **Error Responses:**
  - `400 Bad Request` - Invalid status or edited fields validation failed
  - `401 Unauthorized` - Invalid or missing token
  - `403 Forbidden` - Generation belongs to another user
  - `404 Not Found` - Generation or candidate does not exist

#### Save Accepted Candidates as Flashcards
- **Method:** `POST`
- **Path:** `/api/ai/generations/{generationId}/save`
- **Description:** Save all accepted and edited candidates as flashcards in batch
- **Headers:** `Authorization: Bearer {token}`
- **Success Response:** `201 Created`
```json
{
  "savedCount": 5,
  "flashcardIds": ["uuid1", "uuid2", "uuid3", "uuid4", "uuid5"]
}
```
- **Error Responses:**
  - `400 Bad Request` - No candidates with status "accepted" or "edited"
  - `401 Unauthorized` - Invalid or missing token
  - `403 Forbidden` - Generation belongs to another user
  - `404 Not Found` - Generation does not exist or deck was deleted

**Note:** Only candidates with status "accepted" or "edited" are saved. Flashcards from "accepted" candidates have source "ai", while flashcards from "edited" candidates have source "ai-edited".

### 2.5. Study Mode

#### Get Study Session
- **Method:** `GET`
- **Path:** `/api/decks/{deckId}/study`
- **Description:** Get flashcards for study session in random order
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:**
  - `shuffle` (optional, default: true) - Whether to randomize flashcard order
- **Success Response:** `200 OK`
```json
{
  "deckId": "uuid",
  "deckName": "Biology 101",
  "totalCards": 45,
  "flashcards": [
    {
      "id": "uuid",
      "front": "What is mitosis?",
      "back": "Cell division process that produces two identical daughter cells"
    }
  ]
}
```
- **Error Responses:**
  - `401 Unauthorized` - Invalid or missing token
  - `403 Forbidden` - Deck belongs to another user
  - `404 Not Found` - Deck does not exist

**Note:** The randomization is done server-side. For large decks (>1000 cards), consider implementing cursor-based pagination or limiting the initial response size.

## 3. Authentication and Authorization

### 3.1. Authentication Mechanism

**JWT (JSON Web Token) based authentication** is implemented using Spring Security.

#### Token Structure
- **Access Token:** Short-lived (15 minutes), used for API requests
- **Refresh Token:** Long-lived (7 days), used to obtain new access tokens

#### Token Flow
1. User logs in with email/password → receives both tokens
2. Frontend stores tokens (secure HttpOnly cookies recommended)
3. Every API request includes `Authorization: Bearer {accessToken}` header
4. When access token expires, use refresh token to get new access token
5. On logout, tokens are invalidated server-side

#### Security Headers
All authenticated endpoints require:
```
Authorization: Bearer {jwt-access-token}
```

### 3.2. Authorization Rules

#### Resource-Based Access Control

| Resource | Rule |
|----------|------|
| **User** | Users can only access their own profile |
| **Deck** | Users can only access/modify their own decks |
| **Flashcard** | Users can only access/modify flashcards in their own decks |
| **AIGeneration** | Users can only access their own generation sessions |

#### Implementation
- Spring Security filters validate JWT and extract user ID
- JPA queries automatically filter by authenticated user's ID
- Foreign key relationships enforce data isolation
- 403 Forbidden returned when user attempts to access resources belonging to others

### 3.3. Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth/login` | 5 attempts | 15 minutes per IP |
| `POST /api/auth/password-reset/request` | 3 requests | 1 hour per email |
| `POST /api/ai/generate` | Based on user's monthly limit | Per month per user |

Rate limiting is implemented using Spring Security and in-memory token bucket algorithm (or Redis for distributed systems).

## 4. Validation and Business Logic

### 4.1. Validation Rules by Resource

#### User Validation
- **email**: 
  - Required, not null
  - Must match email regex: `^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`
  - Maximum 255 characters
  - Must be unique across all users
- **password**:
  - Required, not null
  - Minimum 8 characters
  - Must contain at least one uppercase, one lowercase, one digit, and one special character
  - Stored as bcrypt hash with cost factor 12-14
- **monthlyAiLimit**:
  - Required, not null
  - Must be >= 0
  - Default: 100 for new users
- **aiUsageInCurrentMonth**:
  - Required, not null
  - Must be >= 0
  - Default: 0
  - Reset to 0 on first day of each month (scheduled job)

#### Deck Validation
- **name**:
  - Required, not null
  - Trimmed before validation and storage
  - After trimming, must not be empty (length > 0)
  - Maximum 100 characters
  - Must be unique per user (case-sensitive)
- **userId**:
  - Required, not null
  - Must reference existing user
  - Automatically set from authenticated user context

#### Flashcard Validation
- **front**:
  - Required, not null
  - Trimmed before validation and storage
  - After trimming, must not be empty (length > 0)
  - Maximum 500 characters
- **back**:
  - Required, not null
  - Trimmed before validation and storage
  - After trimming, must not be empty (length > 0)
  - Maximum 500 characters
- **deckId**:
  - Required, not null
  - Must reference existing deck owned by authenticated user
- **source**:
  - Required, not null
  - Must be one of: "manual", "ai", "ai-edited"
  - Automatically set based on creation method
- **generationId**:
  - Optional (nullable)
  - If present, must reference existing AI generation

#### AI Generation Validation
- **sourceText** (input parameter):
  - Required, not null
  - Minimum 500 characters
  - Maximum 10,000 characters
- **deckId**:
  - Required, not null
  - Must reference existing deck owned by authenticated user
- **sourceTextHash**:
  - Automatically generated as SHA-256 hash of source text
  - Used for duplicate detection
- **sourceTextLength**:
  - Automatically calculated from source text
- **generatedCandidatesCount**:
  - Must be > 0 after AI generation
- **candidates** (JSONB):
  - Must be valid JSON array
  - Each candidate must have: id, front, back, status
  - Status must be one of: "pending", "accepted", "rejected", "edited"
  - If status is "edited", editedFront and editedBack must be provided and follow flashcard validation rules

### 4.2. Business Logic Implementation

#### User Registration
1. Validate email format and password requirements
2. Check if email already exists (return 409 if duplicate)
3. Hash password using BCrypt
4. Create user with default role "USER" and default monthly AI limit
5. Generate JWT access and refresh tokens
6. Return user profile with tokens

#### User Login
1. Validate credentials against stored bcrypt hash
2. Check rate limiting (5 attempts per 15 minutes per IP)
3. If valid, generate new JWT tokens
4. Return user profile with tokens
5. If invalid, increment failed attempt counter and return 401

#### Password Reset Flow
1. **Request Reset**: 
   - Validate email exists (don't reveal if email not found for security)
   - Generate secure random UUID token
   - Set expiry to 24 hours from now
   - Send email with reset link containing token
   - Rate limit: 3 requests per hour per email
2. **Confirm Reset**:
   - Validate token exists and not expired
   - Validate new password requirements
   - Hash new password and update user
   - Delete reset token (one-time use)
   - Invalidate all existing JWT tokens for this user

#### Deck Creation
1. Trim deck name
2. Validate name length (1-100 chars after trim)
3. Check for duplicate name within user's decks (case-sensitive)
4. Create deck with userId from authenticated context
5. Return created deck with flashcardCount = 0

#### Deck Update
1. Verify deck belongs to authenticated user (403 if not)
2. Trim new deck name
3. Validate name length (1-100 chars after trim)
4. Check for duplicate name within user's decks, excluding current deck
5. Update deck name and updatedAt timestamp
6. Return updated deck

#### Deck Deletion
1. Verify deck belongs to authenticated user (403 if not)
2. Delete deck (CASCADE automatically deletes all flashcards)
3. AI generations referencing this deck have deckId set to NULL (ON DELETE SET NULL)
4. Return 204 No Content

#### Manual Flashcard Creation
1. Verify deck belongs to authenticated user
2. Trim front and back
3. Validate both are non-empty and <= 500 chars
4. Create flashcard with source = "manual", generationId = null
5. Increment deck's flashcardCount (denormalized field or calculated on query)
6. Return created flashcard

#### Flashcard Update
1. Verify flashcard belongs to deck owned by authenticated user
2. Trim front and back
3. Validate both are non-empty and <= 500 chars
4. **Business Rule - Source Change:**
   - If current source is "ai", change to "ai-edited"
   - If current source is "manual", keep as "manual"
   - If current source is "ai-edited", keep as "ai-edited"
5. Update flashcard and updatedAt timestamp
6. Return updated flashcard

#### Flashcard Deletion
1. Verify flashcard belongs to deck owned by authenticated user
2. Delete flashcard
3. Decrement deck's flashcardCount
4. Return 204 No Content

#### AI Flashcard Generation
1. Validate source text length (500-10000 chars)
2. Verify deck belongs to authenticated user
3. **Check AI Usage Limit:**
   - If user's aiUsageInCurrentMonth >= monthlyAiLimit, return 403 with message "Monthly AI generation limit exceeded"
4. Calculate SHA-256 hash of source text
5. **Optional duplicate detection:** Check if same hash exists in recent generations (could warn user)
6. Call AI service (Openrouter.ai) with prompt to generate flashcards
7. Parse AI response into candidate list with status = "pending"
8. Create AIGeneration record with candidates in JSONB column
9. Increment user's aiUsageInCurrentMonth
10. Return generation session with candidates

#### Update Candidate Status (Review Session)
1. Verify generation belongs to authenticated user
2. Validate each candidate update:
   - Status must be valid enum value
   - If status = "edited", editedFront and editedBack must be provided and valid
3. Update candidates array in JSONB column
4. Update updatedAt timestamp
5. Return updated generation session

#### Save Candidates as Flashcards (Batch Save)
1. Verify generation belongs to authenticated user
2. Check if deck still exists (may have been deleted)
3. Filter candidates with status "accepted" or "edited"
4. Validate there's at least one candidate to save
5. **Batch create flashcards:**
   - For "accepted" candidates: use original front/back, set source = "ai"
   - For "edited" candidates: use editedFront/editedBack, set source = "ai-edited"
   - Set generationId = generation.id for all
   - Set deckId = generation.deckId
6. Use JPA batch insert for performance
7. Update deck's flashcardCount
8. Return count and IDs of created flashcards

#### Study Mode
1. Verify deck belongs to authenticated user
2. Query all flashcards in deck
3. **Randomization:**
   - If shuffle=true (default), randomize order server-side using `ORDER BY RANDOM()` (PostgreSQL)
   - For large decks (>1000 cards), consider application-level randomization or pagination
4. Return deck info and flashcard array
5. Frontend handles navigation (next/previous) and flip animation

#### AI Usage Reset (Scheduled Job)
- Run on first day of each month (e.g., via Spring @Scheduled)
- Execute: `UPDATE users SET ai_usage_in_current_month = 0`
- Log execution for audit trail

### 4.3. Error Handling Strategy

#### Standard Error Response Format
All errors return consistent JSON structure:
```json
{
  "timestamp": "2025-01-20T14:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed for field 'name': must not be empty after trimming",
  "path": "/api/decks"
}
```

#### HTTP Status Codes Used
- `200 OK` - Successful GET/PUT/PATCH request
- `201 Created` - Successful POST request creating a resource
- `204 No Content` - Successful DELETE request
- `400 Bad Request` - Validation error or malformed request
- `401 Unauthorized` - Missing, invalid, or expired authentication token
- `403 Forbidden` - User authenticated but not authorized (wrong owner, limit exceeded)
- `404 Not Found` - Resource does not exist
- `409 Conflict` - Duplicate resource (e.g., email already exists, deck name collision)
- `410 Gone` - Resource expired (e.g., password reset token)
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Unexpected server error
- `503 Service Unavailable` - External service (AI) temporarily unavailable

### 4.4. Data Trimming and Transformation

**Automatic trimming** is applied to these fields before validation and storage:
- User: email (also converted to lowercase)
- Deck: name
- Flashcard: front, back

**Automatic transformations:**
- Passwords are hashed with BCrypt (cost 12-14) before storage
- Source text is hashed with SHA-256 for duplicate detection
- Timestamps are stored as UTC and converted to ISO 8601 in responses
- Flashcard source changes from "ai" to "ai-edited" when edited

## 5. Additional Considerations

### 5.1. API Versioning
- Current version: v1 (implicit in /api/ prefix)
- Future versions can use /api/v2/ prefix if breaking changes are needed

### 5.2. CORS Configuration
- Configure CORS in Spring Security to allow frontend origin
- Since frontend is served by Spring Boot, same-origin policy applies
- If frontend deployed separately, whitelist specific origins

### 5.3. Pagination Standards
- Use Spring Data's Pageable interface
- Default page size: 20-50 depending on resource
- Maximum page size: 100 (prevent excessive queries)
- Response includes total elements, total pages, current page number

### 5.4. Performance Optimizations
- Index on foreign keys (deckId, userId, generationId) created via Liquibase
- Composite index on (userId, name) for deck uniqueness check
- GIN index on JSONB candidates column for future queries
- Use JPA batch operations for saving multiple flashcards from AI generation
- Consider caching for user profile data (Redis)

### 5.5. Monitoring and Metrics
Track success metrics defined in PRD:
- **AI Acceptance Rate**: Calculate from ai_generations.generatedCandidatesCount vs flashcards with matching generationId
- **AI Usage Percentage**: Calculate from flashcards where source IN ('ai', 'ai-edited') vs source = 'manual'

### 5.6. OpenAPI/Swagger Documentation
- Use Springdoc OpenAPI to auto-generate API documentation
- Annotations on controllers and DTOs provide detailed schema
- Interactive API docs available at `/swagger-ui.html`
- OpenAPI JSON spec available at `/v3/api-docs`

### 5.7. Security Best Practices
- All endpoints use HTTPS in production
- JWT tokens include expiration and signature verification
- Password reset tokens are single-use and time-limited
- Rate limiting prevents brute force attacks
- SQL injection prevented by JPA parameterized queries
- XSS prevention by proper output encoding in frontend
- CSRF protection for state-changing operations (can use tokens or SameSite cookies)

---

## Appendix: Endpoint Summary Table

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| POST | `/api/auth/password-reset/request` | Request password reset | No |
| POST | `/api/auth/password-reset/confirm` | Confirm password reset | No |
| GET | `/api/users/me` | Get current user profile | Yes |
| GET | `/api/decks` | List user's decks | Yes |
| GET | `/api/decks/{deckId}` | Get single deck | Yes |
| POST | `/api/decks` | Create new deck | Yes |
| PUT | `/api/decks/{deckId}` | Update deck | Yes |
| DELETE | `/api/decks/{deckId}` | Delete deck | Yes |
| GET | `/api/decks/{deckId}/flashcards` | List flashcards in deck | Yes |
| GET | `/api/flashcards/{flashcardId}` | Get single flashcard | Yes |
| POST | `/api/decks/{deckId}/flashcards` | Create manual flashcard | Yes |
| PUT | `/api/flashcards/{flashcardId}` | Update flashcard | Yes |
| DELETE | `/api/flashcards/{flashcardId}` | Delete flashcard | Yes |
| POST | `/api/ai/generate` | Generate AI candidates | Yes |
| GET | `/api/ai/generations/{generationId}` | Get generation session | Yes |
| PATCH | `/api/ai/generations/{generationId}/candidates` | Update candidate status | Yes |
| POST | `/api/ai/generations/{generationId}/save` | Save candidates as flashcards | Yes |
| GET | `/api/ai/generations` | List user's generations | Yes |
| GET | `/api/decks/{deckId}/study` | Get study session | Yes |

**Total Endpoints:** 23


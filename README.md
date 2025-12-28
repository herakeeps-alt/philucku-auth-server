# Philucky Authentication Server

Node.js authentication server with MongoDB for Philucky app with user approval system.

## Features

- ✅ User registration (signup)
- ✅ User login with JWT tokens
- ✅ User approval system (pending → approved/rejected)
- ✅ Admin panel for managing users
- ✅ Demo credentials bypass approval
- ✅ Balance management
- ✅ MongoDB database

## Requirements

- Node.js 16+ 
- MongoDB 4.4+

## Installation

### 1. Install MongoDB (if not installed)

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu/Debian:**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**Windows:**
Download from: https://www.mongodb.com/try/download/community

### 2. Install Dependencies

```bash
cd philucky-auth-server
npm install
```

### 3. Configure Environment

Edit `.env` file if needed:
```env
PORT=3332
MONGODB_URI=mongodb://localhost:27017/philucky-auth
JWT_SECRET=your-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 4. Start Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server will run on: http://localhost:3332

## API Endpoints

### Authentication Endpoints

#### 1. Signup (Register)
```http
POST /api/auth/signup
Content-Type: application/json

{
  "phone": "0712345678",
  "email": "user@example.com",
  "password": "password123",
  "username": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful! Your account is pending approval.",
  "data": {
    "userId": "...",
    "phone": "0712345678",
    "status": "pending"
  }
}
```

#### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "0712345678",
  "password": "password123"
}
```

**Response (Approved User):**
```json
{
  "success": true,
  "message": "Login successful",
  "isDemo": false,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "phone": "0712345678",
      "username": "John Doe",
      "balance": 0,
      "status": "approved"
    }
  }
}
```

**Response (Pending User):**
```json
{
  "success": false,
  "message": "Your account is pending approval. Please wait for admin approval.",
  "status": "pending"
}
```

#### 3. Check Status
```http
GET /api/auth/check-status/0712345678
```

**Response:**
```json
{
  "success": true,
  "data": {
    "phone": "0712345678",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Admin Endpoints

All admin endpoints require Basic Auth headers:
```
username: admin
password: admin123
```

#### 1. Get All Users
```http
GET /api/admin/users
username: admin
password: admin123
```

Query params:
- `?status=pending` - Filter by status

#### 2. Get Pending Users
```http
GET /api/admin/users/pending
username: admin
password: admin123
```

#### 3. Approve User
```http
PUT /api/admin/users/{userId}/approve
username: admin
password: admin123
Content-Type: application/json

{
  "balance": 100
}
```

#### 4. Reject User
```http
PUT /api/admin/users/{userId}/reject
username: admin
password: admin123
Content-Type: application/json

{
  "reason": "Invalid information"
}
```

#### 5. Update Balance
```http
PUT /api/admin/users/{userId}/balance
username: admin
password: admin123
Content-Type: application/json

{
  "balance": 5000
}
```

#### 6. Get Statistics
```http
GET /api/admin/stats
username: admin
password: admin123
```

#### 7. Delete User
```http
DELETE /api/admin/users/{userId}
username: admin
password: admin123
```

## Demo Credentials

Special demo credentials that bypass approval:

**Phone:** 1231237777  
**Password:** Qqqwww888

These credentials always login successfully and show demo mode UI.

## User States

1. **Pending** - Just registered, waiting for admin approval
2. **Approved** - Can login and use the app
3. **Rejected** - Cannot login, account rejected

## Testing with cURL

### Signup
```bash
curl -X POST http://localhost:3332/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0712345678",
    "password": "test123",
    "email": "test@test.com",
    "username": "Test User"
  }'
```

### Login (will fail - pending approval)
```bash
curl -X POST http://localhost:3332/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0712345678",
    "password": "test123"
  }'
```

### Get Pending Users (Admin)
```bash
curl http://localhost:3332/api/admin/users/pending \
  -H "username: admin" \
  -H "password: admin123"
```

### Approve User (Admin)
```bash
curl -X PUT http://localhost:3332/api/admin/users/{userId}/approve \
  -H "Content-Type: application/json" \
  -H "username: admin" \
  -H "password: admin123" \
  -d '{"balance": 100}'
```

### Login (after approval)
```bash
curl -X POST http://localhost:3332/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0712345678",
    "password": "test123"
  }'
```

## Database

MongoDB database: `philucky-auth`
Collection: `users`

### User Schema
```javascript
{
  phone: String (unique, required),
  email: String,
  password: String (hashed, required),
  username: String,
  balance: Number (default: 0),
  status: String (pending|approved|rejected),
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Security Notes

- Passwords are hashed using bcryptjs
- JWT tokens expire after 7 days
- Admin credentials should be changed in production
- Use HTTPS in production
- Store JWT_SECRET securely

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED
```
**Solution:** Make sure MongoDB is running:
```bash
brew services start mongodb-community  # macOS
sudo systemctl start mongodb          # Linux
```

### Port Already in Use
```
Error: listen EADDRINUSE :::3332
```
**Solution:** Kill the process using port 3332:
```bash
lsof -ti:3332 | xargs kill -9
```

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use a strong `JWT_SECRET`
3. Change admin credentials
4. Use MongoDB Atlas or managed MongoDB
5. Enable HTTPS
6. Use PM2 or similar for process management
7. Set up monitoring and logging

## License

ISC

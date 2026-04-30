# 🔐 Strangy Authentication API Documentation

> **Base URL:** `https://api.strangy.in/api/auth`  
> **Testing URL:** `https://api.strangy.in/api/auth` (Production)

---

## 📋 API Summary

| # | Method | Endpoint | Description | Auth Required |
|---|--------|----------|-------------|:---:|
| 1 | POST | `/api/auth/signup` | New account create karo | ❌ |
| 2 | POST | `/api/auth/login` | Email/Password thi login karo | ❌ |
| 3 | POST | `/api/auth/guest` | Guest mode (no email needed) | ❌ |
| 4 | POST | `/api/auth/refresh` | Expired token renew karo | ❌ |
| 5 | POST | `/api/auth/logout` | User ne logout karo | ✅ |
| 6 | GET | `/api/auth/me` | Current user ni full details | ✅ |
| 7 | POST | `/api/auth/forgot-password` | Password reset email moklo | ❌ |

**Total: 7 APIs**

---

## 🔑 Authentication Headers

Jo API ma `Auth Required: ✅` hoy, to tame **Authorization** header moklo:

```
Authorization: Bearer <access_token>
```

`access_token` tame login/signup na response ma malshe.

---

## 1. 📝 SIGNUP — New Account Create Karo

**Endpoint:** `POST https://api.strangy.in/api/auth/signup`

### Request Body (JSON):
```json
{
    "email": "yash@example.com",
    "password": "mypassword123",
    "username": "YashGajera",
    "gender": "Male",
    "birthdate": "2000-05-15"
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| email | string | ✅ | User no email address |
| password | string | ✅ | Minimum 6 characters |
| username | string | ❌ | Display name (default: email no first part) |
| gender | string | ❌ | `Male`, `Female`, or `Other` |
| birthdate | string | ❌ | Format: `YYYY-MM-DD` |

### ✅ Success Response (201):
```json
{
    "success": true,
    "message": "Account created successfully",
    "user": {
        "id": "a1b2c3d4-uuid-here",
        "email": "yash@example.com",
        "username": "YashGajera",
        "gender": "Male",
        "coins": 10
    },
    "session": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "v1.MjQ1NjM4...",
        "expires_at": 1735689600,
        "token_type": "Bearer"
    }
}
```

> 💡 **Note:** Signup pachi automatic 10 free coins malse (Welcome Bonus)!

### ❌ Error Responses:

| Status | Error | Reason |
|--------|-------|--------|
| 400 | `Email and password are required` | Required field missing |
| 400 | `Password must be at least 6 characters` | Password too short |
| 409 | `This email is already registered` | Duplicate email |
| 500 | `Failed to create account` | Server error |

### 📸 Postman Screenshot Steps:
1. Method: `POST`
2. URL: `https://api.strangy.in/api/auth/signup`
3. Body tab → `raw` → `JSON`
4. Paste the request body above
5. Click **Send**

---

## 2. 🔓 LOGIN — Email/Password thi Login

**Endpoint:** `POST https://api.strangy.in/api/auth/login`

### Request Body (JSON):
```json
{
    "email": "yash@example.com",
    "password": "mypassword123"
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| email | string | ✅ | Registered email |
| password | string | ✅ | Account password |

### ✅ Success Response (200):
```json
{
    "success": true,
    "user": {
        "id": "a1b2c3d4-uuid-here",
        "email": "yash@example.com",
        "username": "YashGajera",
        "gender": "Male",
        "birthdate": "2000-05-15",
        "avatar_url": null,
        "coins": 10,
        "is_premium": false,
        "subscription_tier": "free",
        "strike_count": 0
    },
    "session": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "v1.MjQ1NjM4...",
        "expires_at": 1735689600,
        "token_type": "Bearer"
    }
}
```

> 🔒 **Important:** `access_token` ne Flutter app ma securely save karo (SharedPreferences / flutter_secure_storage). Badhi protected API ma aa token moklo.

### ❌ Error Responses:

| Status | Error | Reason |
|--------|-------|--------|
| 400 | `Email and password are required` | Required field missing |
| 401 | `Invalid email or password` | Wrong credentials |
| 403 | `Account suspended` | User banned/blocked |
| 403 | `Email not verified` | Email confirmation pending |

### Ban Response Example:
```json
{
    "error": "Account suspended",
    "reason": "Multiple policy violations",
    "ban_expiry": "2026-05-01T00:00:00.000Z",
    "is_permanent": false
}
```

---

## 3. 👤 GUEST LOGIN — Account Vagar Use Karo

**Endpoint:** `POST /api/auth/guest`

### Request Body (JSON):
```json
{
    "name": "RandomStranger",
    "deviceId": "android_device_abc123"
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| name | string | ❌ | Guest display name (default: "Stranger") |
| deviceId | string | ❌ | Device identifier for tracking |

### ✅ Success Response (201):
```json
{
    "success": true,
    "message": "Guest account created",
    "user": {
        "id": "g1h2i3j4-uuid-here",
        "username": "RandomStranger",
        "is_guest": true,
        "coins": 5
    },
    "session": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "v1.MjQ1NjM4...",
        "expires_at": 1735689600,
        "token_type": "Bearer"
    }
}
```

> 💡 **Note:** Guest users ne 5 free coins malse. Full features mate signup karvu padse.

---

## 4. 🔄 REFRESH TOKEN — Expired Token Renew Karo

**Endpoint:** `POST /api/auth/refresh`

> Token expire thay to aa API call karo. New access_token malshe login karyа vagar.

### Request Body (JSON):
```json
{
    "refresh_token": "v1.MjQ1NjM4..."
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| refresh_token | string | ✅ | Login response ma thi refresh token Malshe |

### ✅ Success Response (200):
```json
{
    "success": true,
    "session": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...(NEW TOKEN)...",
        "refresh_token": "v1.NEW_REFRESH_TOKEN...",
        "expires_at": 1735776000,
        "token_type": "Bearer"
    }
}
```

### ❌ Error Responses:

| Status | Error | Reason |
|--------|-------|--------|
| 400 | `refresh_token is required` | Token missing |
| 401 | `Session expired. Please login again.` | Refresh token pan expired |

### 📱 Flutter Usage:
```dart
// Flutter ma token auto-refresh logic
if (response.statusCode == 401) {
  // Token expired - refresh karo
  final newTokens = await authService.refreshToken(savedRefreshToken);
  // Retry original request with new token
}
```

---

## 5. 🚪 LOGOUT — User ne Logout Karo

**Endpoint:** `POST https://api.strangy.in/api/auth/logout`

### Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Request Body: **Empty** (No body needed)

### ✅ Success Response (200):
```json
{
    "success": true,
    "message": "Logged out successfully"
}
```

> 💡 **Flutter Tip:** Logout pachi local storage ma thi pan `access_token` ane `refresh_token` clear karo!

---

## 6. 👁️ GET ME — Current User ni Details Lavo

**Endpoint:** `GET /api/auth/me`

> App open thay tyare aa API call karo. Token valid che ke nahi te check thay, ane user ni full profile malshe.

### Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### ✅ Success Response (200):
```json
{
    "success": true,
    "user": {
        "id": "a1b2c3d4-uuid-here",
        "email": "yash@example.com",
        "username": "YashGajera",
        "gender": "Male",
        "birthdate": "2000-05-15",
        "avatar_url": "https://supabase.co/storage/avatars/abc.jpg",
        "coins": 45,
        "is_premium": true,
        "subscription_tier": "gold",
        "subscription_status": "active",
        "subscription_expires_at": "2027-04-29T00:00:00.000Z",
        "strike_count": 0,
        "is_blocked": false,
        "total_coins_purchased": 100,
        "total_coins_spent": 55
    }
}
```

### ❌ Error Responses:

| Status | Error | Reason |
|--------|-------|--------|
| 401 | `Authorization header required` | Header missing |
| 401 | `Invalid or expired token` | Token kharab che |

### 📱 Flutter Usage:
```dart
// App startup ma user check karo
Future<User?> checkAuth() async {
  final token = await secureStorage.read(key: 'access_token');
  if (token == null) return null;
  
  final response = await http.get(
    Uri.parse('$baseUrl/api/auth/me'),
    headers: {'Authorization': 'Bearer $token'},
  );
  
  if (response.statusCode == 200) {
    return User.fromJson(jsonDecode(response.body)['user']);
  }
  return null; // Token invalid, show login screen
}
```

---

## 7. 📧 FORGOT PASSWORD — Password Reset Email

**Endpoint:** `POST /api/auth/forgot-password`

### Request Body (JSON):
```json
{
    "email": "yash@example.com"
}
```

### ✅ Success Response (200):
```json
{
    "success": true,
    "message": "If this email is registered, you will receive a password reset link."
}
```

> 🔒 **Security Note:** Aa API hamesha success return karse, bhale email exist na kartu hoy. Aathi koi ne khabar nahi padse ke kyo email registered che.

---

## 🧪 Postman Testing Guide

### Step 1: Environment Setup
Postman ma ek **Environment** banavo ane aa variables set karo:

| Variable | Value |
|----------|-------|
| `base_url` | `http://localhost:3000` |
| `access_token` | *(login pachi auto-fill thase)* |

### Step 2: Testing Order

1. **Signup Test** → `/api/auth/signup` → Account banshe + token malshe
2. **Login Test** → `/api/auth/login` → Token malshe, env ma save karo
3. **Get Me Test** → `/api/auth/me` → Token thi profile malshe
4. **Guest Test** → `/api/auth/guest` → Guest account banshe
5. **Refresh Test** → `/api/auth/refresh` → New token malshe
6. **Logout Test** → `/api/auth/logout` → Session destroy thase

### Step 3: Auto-Save Token (Postman Script)
Login API na **Tests** tab ma aa script nakhjo jathi token auto-save thay:

```javascript
// Postman Tests tab ma paste karo
if (pm.response.code === 200 || pm.response.code === 201) {
    var data = pm.response.json();
    if (data.session) {
        pm.environment.set("access_token", data.session.access_token);
        pm.environment.set("refresh_token", data.session.refresh_token);
    }
}
```

Pachi baaki ni APIs ma Authorization header ma `Bearer {{access_token}}` lakho.

---

## 🔄 Flutter Integration Flow

```
App Open
  ↓
Check stored access_token
  ↓
GET /api/auth/me ─── 401? ──→ Try /api/auth/refresh
  ↓                                    ↓
  200 OK                          401? → Show Login Screen
  ↓                                    ↓
  Go to Home                      200 OK → Retry /me
```

### Token Storage in Flutter:
```dart
// flutter_secure_storage use karo
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final storage = FlutterSecureStorage();

// Save tokens after login
await storage.write(key: 'access_token', value: session.accessToken);
await storage.write(key: 'refresh_token', value: session.refreshToken);

// Read token for API calls
final token = await storage.read(key: 'access_token');
```

---

## ⚠️ Common Errors

| Error | Meaning | Solution |
|-------|---------|----------|
| `Email and password are required` | Body ma data nathi | Postman ma Body → raw → JSON select karo |
| `Invalid email or password` | Wrong credentials | Email/password check karo |
| `Account suspended` | User banned che | Admin panel thi unban karo |
| `Invalid or expired token` | Token expired | `/api/auth/refresh` call karo |
| `This email is already registered` | Duplicate signup | Login karo instead |

---

**Created by:** Strangy Development Team  
**Last Updated:** April 2026

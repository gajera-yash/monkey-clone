# 👤 Strangy User & Profile API Documentation

> **Base URL:** `https://api.strangy.in/api/user`  
> **All endpoints require `Authorization: Bearer <access_token>` unless specified**

---

## 📋 API Summary

| # | Method | Endpoint | Description | Auth Required |
|---|--------|----------|-------------|:---:|
| 1 | GET | `/api/user/profile/:id` | Koi pan user ni public profile juo | ❌ |
| 2 | PUT | `/api/user/profile` | Potani profile update karo | ✅ |
| 3 | PUT | `/api/user/avatar` | Avatar/profile photo update karo | ✅ |
| 4 | GET | `/api/user/stats` | Potana coins, chats, stats juo | ✅ |
| 5 | POST | `/api/user/block` | Koi user ne block karo | ✅ |
| 6 | POST | `/api/user/unblock` | Blocked user ne unblock karo | ✅ |
| 7 | GET | `/api/user/blocked` | Badha blocked users ni list juo | ✅ |
| 8 | DELETE | `/api/user/account` | Account permanently delete karo | ✅ |
| 9 | PUT | `/api/user/settings` | Safety/notification settings update karo | ✅ |

**Total: 9 APIs**

---

## 🔑 Authentication Headers

Jo API ma `Auth Required: ✅` hoy, to tame **Authorization** header moklo:

```
Authorization: Bearer <access_token>
```

`access_token` tame `/api/auth/login` athva `/api/auth/signup` na response ma malshe.

---

## 1. 👁️ GET PROFILE — Koi Pan User Ni Profile Juo

**Endpoint:** `GET https://api.strangy.in/api/user/profile/:id`

> Koi pan user ni public profile jovа mate. Auth required nathi.

### URL Parameter:

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| id | string (UUID) | ✅ | User no unique ID |

### Example:
```
GET https://api.strangy.in/api/user/profile/a1b2c3d4-uuid-here
```

### ✅ Success Response (200):
```json
{
    "success": true,
    "profile": {
        "id": "a1b2c3d4-uuid-here",
        "username": "YashGajera",
        "avatar_url": "https://supabase.co/storage/avatars/abc.jpg",
        "gender": "Male",
        "bio": "Hey there! I love chatting 🎉",
        "is_creator": false,
        "is_verified": false,
        "is_premium": true,
        "total_chats": 142,
        "total_hours_online": 56.5,
        "member_since": "2026-01-15T10:30:00.000Z",
        "last_seen": "2026-04-30T16:00:00.000Z"
    }
}
```

### ❌ Error Responses:

| Status | Error | Reason |
|--------|-------|--------|
| 400 | `User ID is required` | ID parameter missing |
| 404 | `User not found` | Invalid ID or banned user |

---

## 2. ✏️ UPDATE PROFILE — Potani Profile Edit Karo

**Endpoint:** `PUT https://api.strangy.in/api/user/profile`

### Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Request Body (JSON):
```json
{
    "username": "YashGajera_Pro",
    "gender": "Male",
    "bio": "Strangy enthusiast! 🚀",
    "birthdate": "2000-05-15",
    "location_city": "Ahmedabad",
    "location_country": "India"
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| username | string | ❌ | 2-30 characters, letters/numbers/underscores only |
| gender | string | ❌ | `Male`, `Female`, or `Other` |
| bio | string | ❌ | Maximum 200 characters |
| birthdate | string | ❌ | Format: `YYYY-MM-DD` |
| location_city | string | ❌ | City name |
| location_country | string | ❌ | Country name |

> 💡 **Note:** Tame je fields change karva hoy e j moklo. Badha fields ek sathe moklva jaruri nathi.

### ✅ Success Response (200):
```json
{
    "success": true,
    "message": "Profile updated successfully",
    "profile": {
        "username": "YashGajera_Pro",
        "gender": "Male",
        "bio": "Strangy enthusiast! 🚀",
        "birthdate": "2000-05-15",
        "avatar_url": "https://supabase.co/storage/avatars/abc.jpg",
        "location_city": "Ahmedabad",
        "location_country": "India",
        "is_profile_completed": true
    }
}
```

### ❌ Error Responses:

| Status | Error | Reason |
|--------|-------|--------|
| 400 | `Username must be 2-30 characters` | Username too short/long |
| 400 | `Username can only contain letters, numbers, underscores, and spaces` | Invalid characters |
| 400 | `Gender must be Male, Female, or Other` | Invalid gender value |
| 400 | `Bio must be under 200 characters` | Bio too long |
| 400 | `Birthdate must be in YYYY-MM-DD format` | Wrong date format |
| 400 | `No fields to update` | Empty request body |
| 401 | `Invalid or expired token` | Token expired — login again |

---

## 3. 🖼️ UPDATE AVATAR — Profile Photo Change Karo

**Endpoint:** `PUT https://api.strangy.in/api/user/avatar`

### Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Request Body (JSON):
```json
{
    "avatar_url": "https://xzveyvqflkzqzthmnnud.supabase.co/storage/v1/object/public/avatars/user123.jpg"
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| avatar_url | string (URL) | ✅ | Valid image URL (Supabase storage URL recommended) |

### ✅ Success Response (200):
```json
{
    "success": true,
    "message": "Avatar updated successfully",
    "avatar_url": "https://xzveyvqflkzqzthmnnud.supabase.co/storage/v1/object/public/avatars/user123.jpg"
}
```

### ❌ Error Responses:

| Status | Error | Reason |
|--------|-------|--------|
| 400 | `avatar_url is required` | Field missing |
| 400 | `Invalid URL format for avatar_url` | Wrong URL format |

---

## 4. 📊 GET MY STATS — Potana Stats Juo

**Endpoint:** `GET https://api.strangy.in/api/user/stats`

> Potana coins, chats, subscription, ane badha stats ek j API call ma.

### Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Request Body: **Empty** (GET request)

### ✅ Success Response (200):
```json
{
    "success": true,
    "stats": {
        "coins": 45,
        "stars": 120,
        "total_chats": 142,
        "avg_chat_duration": 8.5,
        "total_hours_online": 56.5,
        "total_chat_duration": 1205,
        "total_coins_purchased": 100,
        "total_coins_spent": 55,
        "is_premium": true,
        "subscription_tier": "gold",
        "subscription_status": "active",
        "subscription_expires_at": "2027-04-29T00:00:00.000Z",
        "reward_streak": 5,
        "last_reward_claim": "2026-04-30T10:00:00.000Z",
        "strike_count": 0,
        "referral_code": "YASH2026",
        "member_since": "2026-01-15T10:30:00.000Z"
    }
}
```

---

## 5. 🚫 BLOCK USER — Koi User Ne Block Karo

**Endpoint:** `POST https://api.strangy.in/api/user/block`

### Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Request Body (JSON):
```json
{
    "blocked_user_id": "b2c3d4e5-uuid-of-user-to-block",
    "reason": "Inappropriate behavior"
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| blocked_user_id | string (UUID) | ✅ | Je user ne block karvu hoy eno ID |
| reason | string | ❌ | Block karva nu reason (optional) |

### ✅ Success Response (200):
```json
{
    "success": true,
    "message": "User YashGajera has been blocked"
}
```

### ❌ Error Responses:

| Status | Error | Reason |
|--------|-------|--------|
| 400 | `blocked_user_id is required` | Field missing |
| 400 | `You cannot block yourself` | Self-block attempt |
| 404 | `User to block not found` | Invalid user ID |
| 409 | `User is already blocked` | Duplicate block |

---

## 6. ✅ UNBLOCK USER — Blocked User Ne Unblock Karo

**Endpoint:** `POST https://api.strangy.in/api/user/unblock`

### Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Request Body (JSON):
```json
{
    "blocked_user_id": "b2c3d4e5-uuid-of-user-to-unblock"
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| blocked_user_id | string (UUID) | ✅ | Je user ne unblock karvu hoy eno ID |

### ✅ Success Response (200):
```json
{
    "success": true,
    "message": "User has been unblocked"
}
```

---

## 7. 📋 GET BLOCKED LIST — Blocked Users Ni List Juo

**Endpoint:** `GET https://api.strangy.in/api/user/blocked`

### Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Request Body: **Empty** (GET request)

### ✅ Success Response (200):
```json
{
    "success": true,
    "count": 2,
    "blocked_users": [
        {
            "id": "record-uuid-1",
            "user_id": "b2c3d4e5-blocked-user-uuid",
            "username": "AnnoyingUser",
            "avatar_url": "https://supabase.co/storage/avatars/annoying.jpg",
            "reason": "Spam messages",
            "blocked_at": "2026-04-28T14:00:00.000Z"
        },
        {
            "id": "record-uuid-2",
            "user_id": "c3d4e5f6-another-blocked-uuid",
            "username": "BadPerson",
            "avatar_url": null,
            "reason": null,
            "blocked_at": "2026-04-25T09:30:00.000Z"
        }
    ]
}
```

---

## 8. 🗑️ DELETE ACCOUNT — Account Permanently Delete Karo

**Endpoint:** `DELETE https://api.strangy.in/api/user/account`

> ⚠️ **WARNING:** Aa action PERMANENT che! Account delete thaya pachi recover nahi thay!

### Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Request Body (JSON):
```json
{
    "confirm": "DELETE_MY_ACCOUNT"
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| confirm | string | ✅ | Exactly `DELETE_MY_ACCOUNT` likhvu padse (safety check) |

### ✅ Success Response (200):
```json
{
    "success": true,
    "message": "Account permanently deleted. All data has been removed."
}
```

### ❌ Error Responses:

| Status | Error | Reason |
|--------|-------|--------|
| 400 | `Account deletion requires confirmation` | `confirm` field missing or wrong value |

> 🔒 **Safety:** `"confirm": "DELETE_MY_ACCOUNT"` exact string moklva padse. Aathi accidental delete nahi thay.

---

## 9. ⚙️ UPDATE SETTINGS — Safety Settings Change Karo

**Endpoint:** `PUT https://api.strangy.in/api/user/settings`

### Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Request Body (JSON):
```json
{
    "safety_settings": {
        "nsfw_filter": true,
        "auto_skip_flagged": true,
        "allow_direct_calls": false,
        "notification_sound": true,
        "show_online_status": true,
        "allow_strangers_message": false
    }
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| safety_settings | object | ✅ | Key-value pairs of settings |

> 💡 **Note:** Tame je settings change karva hoy e j moklo. Existing settings override nahi thase — merge thase.

### ✅ Success Response (200):
```json
{
    "success": true,
    "message": "Settings updated successfully",
    "safety_settings": {
        "nsfw_filter": true,
        "auto_skip_flagged": true,
        "allow_direct_calls": false,
        "notification_sound": true,
        "show_online_status": true,
        "allow_strangers_message": false
    }
}
```

---

## 🧪 Postman Testing Guide

### Step 1: Pehla Login Karo
Auth APIs thi login karo ane `access_token` save karo:
```
POST https://api.strangy.in/api/auth/login
Body: { "email": "yash@example.com", "password": "mypassword123" }
```

### Step 2: Token Set Karo
Postman ma **Auth** tab → **Bearer Token** → Response ma thi `access_token` paste karo.

### Step 3: Testing Order

1. **Get Profile** → `GET /api/user/profile/{your-user-id}` → Public profile juo
2. **Update Profile** → `PUT /api/user/profile` → Username/bio change karo
3. **Update Avatar** → `PUT /api/user/avatar` → Photo URL set karo
4. **Get Stats** → `GET /api/user/stats` → Coins ane stats juo
5. **Block User** → `POST /api/user/block` → Koi ne block karo
6. **Get Blocked** → `GET /api/user/blocked` → Blocked list juo
7. **Unblock User** → `POST /api/user/unblock` → Unblock karo
8. **Update Settings** → `PUT /api/user/settings` → Settings change karo
9. **Delete Account** → `DELETE /api/user/account` → ⚠️ Careful! Permanent che!

---

## 📱 Flutter Integration Examples

### Profile Update:
```dart
Future<void> updateProfile({String? username, String? bio}) async {
  final token = await secureStorage.read(key: 'access_token');
  
  final response = await http.put(
    Uri.parse('$baseUrl/api/user/profile'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      if (username != null) 'username': username,
      if (bio != null) 'bio': bio,
    }),
  );
  
  if (response.statusCode == 200) {
    print('Profile updated!');
  }
}
```

### Get Stats:
```dart
Future<Map<String, dynamic>> getMyStats() async {
  final token = await secureStorage.read(key: 'access_token');
  
  final response = await http.get(
    Uri.parse('$baseUrl/api/user/stats'),
    headers: {'Authorization': 'Bearer $token'},
  );
  
  final data = jsonDecode(response.body);
  return data['stats'];
}
```

### Block/Unblock User:
```dart
Future<void> blockUser(String userId, {String? reason}) async {
  final token = await secureStorage.read(key: 'access_token');
  
  await http.post(
    Uri.parse('$baseUrl/api/user/block'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'blocked_user_id': userId,
      if (reason != null) 'reason': reason,
    }),
  );
}
```

---

## ⚠️ Common Errors

| Error | Meaning | Solution |
|-------|---------|----------|
| `Authorization header required` | Token nathi moklyu | Header ma `Bearer <token>` add karo |
| `Invalid or expired token` | Token expired che | `/api/auth/refresh` call karo |
| `No fields to update` | Empty body moklyu | Minimum ek field moklo |
| `Username must be 2-30 characters` | Username validation fail | 2 thi 30 character rakho |
| `User not found` | Wrong user ID | Correct UUID moklo |
| `User is already blocked` | Duplicate block attempt | Already blocked che |
| `Account deletion requires confirmation` | Confirm field missing | `"confirm": "DELETE_MY_ACCOUNT"` moklo |

---

**Created by:** Strangy Development Team  
**Last Updated:** April 2026  
**Related:** [Auth API Documentation](./API_README.md)

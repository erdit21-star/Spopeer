# Spopeer API Reference

All endpoints are prefixed with `/api`. Authenticated requests require `Authorization: Bearer <token>`.

---

## Authentication (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/signup` | No | Create account. Body: `{ email, password, firstName, lastName, role?, sport? }` |
| POST | `/login` | No | Log in. Body: `{ email, password }` → `{ token, user }` |
| GET | `/me` | Yes | Get current user profile |
| GET | `/user-by-email?email=` | Yes | Look up user by email |

---

## Users & Profiles (`/api/users`, `/api/profiles`)

Both mounts point to the same router. `/api/profiles` is a frontend compatibility alias.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Optional | List users. Query: `page, limit, role, sport, search` |
| GET | `/:id` | Optional | Get user by ID (privacy-aware) |
| PUT | `/:id` | Yes | Update profile fields |
| POST | `/avatar` | Yes | Upload avatar (multipart `avatar`) |
| POST | `/cover` | Yes | Upload cover photo (multipart `cover`) |
| GET | `/profile/:email` | Optional | Get profile by email (public) |
| POST | `/` | Yes | Save/update profile (frontend compat) |
| POST | `/profile` | Yes | Alias for above |

---

## Posts (`/api/posts`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Optional | List posts (query: `page, limit`) |
| POST | `/` | Yes | Create post |
| GET | `/:id` | Optional | Get single post |
| PUT | `/:id` | Yes | Update post |
| DELETE | `/:id` | Yes | Delete post |
| POST | `/:id/like` | Yes | Like a post |
| DELETE | `/:id/like` | Yes | Unlike a post |
| POST | `/:id/comment` | Yes | Add comment |
| POST | `/:id/repost` | Yes | Repost |
| POST | `/:id/view` | Yes | Register a view |
| GET | `/feed/for-you` | Yes | For You feed |
| GET | `/feed/following` | Yes | Following feed |
| GET | `/feed/sport` | Yes | Sport-specific feed (query: `sport`) |
| GET | `/feed/trending` | Yes | Trending feed |

---

## Follows (`/api/follows`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/:userId` | Yes | Follow user |
| DELETE | `/:userId` | Yes | Unfollow user |
| GET | `/status/:userId` | Yes | Get follow status |
| GET | `/followers/:userId` | Optional | List followers |
| GET | `/following/:userId` | Optional | List following |
| GET | `/stats/:userId` | Optional | Get follower/following counts |

---

## Connections (`/api/connections`)

Body-based alternative to follows (legacy).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/follow` | Yes | Follow. Body: `{ userId }` |
| POST | `/unfollow` | Yes | Unfollow. Body: `{ userId }` |
| GET | `/status/:userId` | Yes | Follow status |
| GET | `/followers/:userId` | Optional | List followers |
| GET | `/following/:userId` | Optional | List following |

---

## Bookmarks (`/api/bookmarks`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List bookmarks |
| POST | `/` | Yes | Create bookmark. Body: `{ postId, type? }` |
| DELETE | `/:bookmarkId` | Yes | Remove bookmark |

---

## Messages (`/api/messages`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Yes | Send message. Body: `{ receiverId, content }` |
| POST | `/send` | Yes | Compat send. Body: `{ toId, text }` or `{ receiverId, content }` |
| GET | `/conversations` | Yes | List conversations |
| GET | `/conversation/:userId1/:userId2` | Yes | Get conversation between two users |
| GET | `/:userId` | Yes | Get messages with user |
| PUT | `/:id/read` | Yes | Mark message read |
| POST | `/mark-read` | Yes | Compat mark-read. Body: `{ fromId }` |
| GET | `/unread/:userId` | Yes | Get unread count |

---

## Marketplace (`/api/marketplace`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/listings` | No | List/filter listings |
| POST | `/listings` | Yes | Create listing |
| GET | `/listings/:id` | No | Get listing detail |
| PUT | `/listings/:id` | Yes | Update listing |
| DELETE | `/listings/:id` | Yes | Delete listing |
| PATCH | `/listings/:id/status` | Yes | Update listing status |
| POST | `/listings/:id/flag` | Yes | Flag listing |
| GET | `/search` | No | Search listings |
| GET | `/my-listings` | Yes | Current user's listings |
| GET | `/saved` | Yes | Saved/bookmarked listings |
| POST | `/saved/:listingId` | Yes | Toggle save listing |
| GET | `/seller/:userId` | No | Seller's listings |
| GET | `/trending-searches` | No | Trending search terms |
| POST | `/inquiries` | Yes | Create inquiry |
| GET | `/inquiries/received` | Yes | Received inquiries |
| GET | `/inquiries/sent` | Yes | Sent inquiries |
| PATCH | `/inquiries/:id/status` | Yes | Update inquiry status |

---

## Search (`/api/search`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Search users. Query: `term, pageSize` → `{ results }` |

---

## Events (`/api/events`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Optional | List events |
| POST | `/` | Yes | Create event |
| POST | `/:id/respond` | Yes | RSVP. Body: `{ status }` |

---

## Media (`/api/media`)

> **Note**: Media storage is currently in-memory. Uploads are lost on server restart.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/upload` | Yes | Upload media file (multipart `file`) |
| GET | `/user/:userId` | No | Get user's media |
| GET | `/:mediaId` | No | Get single media item |
| PATCH | `/:mediaId` | Yes | Update caption |
| DELETE | `/:mediaId` | Yes | Delete media |

---

## Groups (`/api/groups`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Optional | List groups |
| POST | `/` | Yes | Create group |
| GET | `/:id` | Optional | Get group |
| PUT | `/:id` | Yes | Update group |
| DELETE | `/:id` | Yes | Delete group |

---

## Forums (`/api/forums`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Optional | List threads |
| POST | `/` | Yes | Create thread |
| GET | `/:id` | Optional | Get thread with replies |
| POST | `/:id/replies` | Yes | Add reply |

---

## Reels (`/api/reels`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Optional | List reels |
| POST | `/` | Yes | Create reel |
| GET | `/:id` | Optional | Get reel |
| POST | `/:id/like` | Yes | Like reel |
| POST | `/:id/comment` | Yes | Comment on reel |

---

## Notifications (`/api/notifications`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List notifications |
| PUT | `/:id/read` | Yes | Mark notification read |
| PUT | `/read-all` | Yes | Mark all read |

---

## Admin (`/api/admin`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard` | Admin | Dashboard stats |

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Server health check |

---

## Rate Limits

| Scope | Window | Max Requests |
|-------|--------|-------------|
| General API | 15 min | 100 |
| Auth (login/signup) | 15 min | 10 |
| Search | 1 min | 30 |
| Uploads | 1 hour | 30 |

---

# Contributing
See `docs/SETUP.md` for local development steps.


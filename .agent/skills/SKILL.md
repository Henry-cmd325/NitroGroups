---
name: NitroGroups Backend-Frontend Integration Checklist
description: Lessons learned from debugging endpoint issues — mandatory checklist for creating or modifying any API endpoint to ensure professional, bug-free integration
---

# NitroGroups Backend-Frontend Integration Checklist

This skill captures critical lessons learned from real production bugs. Follow this checklist **every time** you create or modify an API endpoint, handler, or frontend service method.

---

## 1. No Duplicate Entity Creation

**Bug:** `CreateMusicianCommandHandler` always created a **new User** via AutoMapper, even if `/auth/sync` had already created one with the same Auth0 ID. This caused `getByAuth0Id` to return the wrong user (the first one, without a group), leading to persistent 404 errors.

### Rule
Before creating a new entity that has a **unique external identifier** (Auth0 ID, email, slug, etc.):

```csharp
// ✅ CORRECT — Check for existing entity first
var existing = await _unitOfWork.Users.FindAsync(u => u.Auth0Id == command.Auth0Id);
var user = existing.FirstOrDefault();

if (user != null)
{
    // Reuse existing, update what's needed via domain methods
    user.UpdateUserType(UserType.BandMember);
}
else
{
    // Only create new if it truly doesn't exist
    user = _mapper.Map<User>(command);
    await _unitOfWork.Users.CreateAsync(user);
}
```

```csharp
// ❌ WRONG — Blindly creates duplicates
var user = _mapper.Map<User>(command);          // Always creates new
await _unitOfWork.Users.CreateAsync(user);      // Duplicate if already exists
```

### When to apply
- Any handler that creates Users, Musicians, Groups, or any entity with a unique constraint
- Especially in flows where **multiple services** can create the same entity (e.g., Auth0 sync + musician registration)

---

## 2. Endpoint Return Types Must Match Frontend Expectations

**Bug:** `PUT /api/groups/{id}` returned `NoContent()` (HTTP 204, empty body), but the frontend expected a JSON `GroupResponse`. The `updatedGroup` variable was always `undefined`, causing UI data loss on save.

### Rule
Always verify what the **frontend expects** from the endpoint response:

```csharp
// ✅ CORRECT — Return the updated entity so the frontend can use it
return Ok(_mapper.Map<GroupResponse>(updatedEntity));
```

```csharp
// ❌ WRONG — Frontend stores the response but gets undefined
return NoContent(); // 204 with no body
```

### Checklist
- [ ] Does the frontend use the response body? If yes, the endpoint MUST return it
- [ ] Are `PUT`/`POST` handlers returning the full entity (with includes for navigation properties)?
- [ ] After saving, does the handler reload the entity with `.Include()` before mapping to the DTO?

---

## 3. Protect Server-Managed Fields in Update Endpoints

**Bug:** The `GroupRequest` DTO included fields like `AverageRating`, `TotalReviews`, `ViewCount` which are server-managed metrics. The frontend could overwrite them to arbitrary values.

### Rule
In AutoMapper profiles, **ignore all server-managed fields** on update mappings:

```csharp
// ✅ CORRECT — Ignore server-managed fields
CreateMap<UpdateGroupCommand, Group>()
    .ForMember(d => d.AverageRating, o => o.Ignore())
    .ForMember(d => d.TotalReviews, o => o.Ignore())
    .ForMember(d => d.ViewCount, o => o.Ignore())
    .ForMember(d => d.BookingCount, o => o.Ignore())
    .ForMember(d => d.IsVerified, o => o.Ignore())
    .ForMember(d => d.IsFeatured, o => o.Ignore());
```

### Fields that are ALWAYS server-managed
- Ratings and reviews (`AverageRating`, `TotalReviews`)
- Counters (`ViewCount`, `BookingCount`)
- Verification status (`IsVerified`, `IsFeatured`)
- Timestamps (`CreatedAt`, `UpdatedAt`)
- IDs and foreign keys

---

## 4. Frontend Error Handling Must Allow React Query Retries

**Bug:** `groupsService.getByUserId()` caught the 404 error and returned `null` instead of throwing. React Query only retries on **thrown errors**, so `retry: 3` was completely bypassed — the query "succeeded" with `null` and was cached permanently.

### Rule
In service methods, **do NOT swallow errors** that React Query should retry:

```typescript
// ✅ CORRECT — Let errors propagate for retry
getByUserId: async (userId: number): Promise<MusicGroup | null> => {
    const { data } = await apiClient.get(`/users/${userId}/groups`);
    return data;
    // Errors propagate naturally → React Query retries
},
```

```typescript
// ❌ WRONG — Swallows 404, React Query thinks it succeeded with null
} catch (error) {
    if (axiosError.response?.status === 404) {
        return null;  // React Query caches null as "success"
    }
    throw error;
}
```

### When to apply
- Any service method used by a `useQuery` that needs retry behavior
- Especially in flows where data is created **asynchronously** (e.g., via Outbox/event processor)

---

## 5. Asynchronous Entity Creation Requires Polling on Frontend

**Bug:** After `POST /api/musicians`, the group is created via an **Outbox background processor** (~5-10 seconds). The frontend redirected immediately to the dashboard, queried for the group, got 404, and never retried.

### Rule
When a resource is created asynchronously (via Outbox, background job, event handler), the frontend **must** poll:

```typescript
// ✅ CORRECT — Poll with retries for async-created resources
const groupQuery = useQuery({
    queryKey: ["music-group", userId],
    queryFn: () => groupsService.getByUserId(userId),
    retry: 5,
    retryDelay: 3000,    // 5 × 3s = 15s polling window
    refetchOnMount: true,
    enabled: !!userId,
});
```

```typescript
// ❌ WRONG — No retry = permanent 404 for async resources
const groupQuery = useQuery({
    queryFn: () => groupsService.getByUserId(userId),
    retry: false,           // Never retries
    refetchOnMount: false,  // Never refetches
});
```

### How to calculate retry window
- Check how long the Outbox/background processor takes (typically 5-15 seconds)
- Set `retry × retryDelay > expected processing time`
- For NitroGroups Outbox: 5 retries × 3s = 15s covers the typical ~5-10s processing time

---

## 6. Domain Entity Encapsulation

**Bug:** Tried to set `User.UserType` directly but it had a `private set`. Had to add a domain method `UpdateUserType()`.

### Rule
Always use **domain methods** to modify entity state. Never try to set properties directly from handlers:

```csharp
// ✅ CORRECT — Use domain methods
existingUser.UpdateUserType(UserType.BandMember);
existingUser.UpdateLastLogin();
```

```csharp
// ❌ WRONG — Private setters will cause compile errors
existingUser.UserType = UserType.BandMember;  // CS0200
```

### When creating new entity methods
- Add the method to the **Domain** layer entity class
- Use `private set` on all properties, expose mutation through explicit methods
- Name methods descriptively (e.g., `UpdateUserType`, `Activate`, `MarkAsVerified`)

---

## 7. Global Query Filters and Navigation Properties

**Warning:** EF Core logs a warning about `Group` having a global query filter that affects `GroupMember` and `GroupGenre` navigations. This can cause unexpected `null` results when joining through soft-deleted entities.

### Rule
If an entity has a global query filter (soft delete), ensure related entities either:
1. Have matching query filters, OR
2. Navigations are marked as optional

### NitroGroups-specific
- `Group` has a soft-delete filter (`DeletedAt == null`)
- `GroupMember` and `GroupGenre` reference `Group` as required
- When querying through navigation properties, verify the filter doesn't exclude expected results

---

## Quick Reference: New Endpoint Checklist

When creating or modifying ANY endpoint:

- [ ] **No duplicates**: Check for existing entities before creating
- [ ] **Return type**: Does it match what the frontend expects? (JSON body vs NoContent)
- [ ] **Includes**: Are navigation properties loaded for the response DTO?
- [ ] **Protected fields**: Are server-managed fields ignored in AutoMapper update mappings?
- [ ] **Frontend retry**: Does the service method throw errors (not swallow them)?
- [ ] **Async resources**: Does the frontend poll/retry for resources created by background processors?
- [ ] **Domain methods**: Are entity modifications going through domain methods?
- [ ] **Query filters**: Are soft-delete filters compatible with the query's navigation joins?

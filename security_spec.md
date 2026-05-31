# Security Specification

## 1. Data Invariants
1. A user's profile, balance, positions, history, journals, and notifications can only be created, read, updated, or deleted by the user whose UID matches the `userId` in the document path.
2. `userId` in the payload must strictly match the `userId` in the document path and `request.auth.uid`.
3. Read access is strictly restricted to `isOwner()`.
4. The size of fields and collections must be bounded (e.g., strings <= 500 characters, history is append-only with bounds, arrays aren't used for unbounded data).

## 2. The "Dirty Dozen" Payloads
1. Create a profile as an unauthenticated user (Identity)
2. Create a profile for another user (Spoofing)
3. Read another user's balance (Privacy)
4. Update own profile with a 1MB string (Resource Poisoning)
5. Add a journal entry with a non-string `title` (Type Safety)
6. Add a position with `action` = 'MAGIC' (Enum bypass)
7. Update a completed trade history result to 'win' when it was 'loss' (State Shortcutting)
8. Read collection `users/{otherId}/history` (Scraping)
9. Create a notification without a required `message` field (Schema Integrity)
10. Update the `userId` field to a different value (Identity Integrity)
11. Send a ghost field in `journals` (Shadow Update)
12. Delete another user's active position (Access bypass)

## 3. The Test Runner
A `firestore.rules.test.ts` file should be built to run these payloads and expect Permission Denied.

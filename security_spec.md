# Security Specification

## Data Invariants
1. A task must belong to a valid project.
2. A plan must belong to a valid project.
3. Users can only edit tasks assigned to them, or if they are the project manager (simplified: for now, all authenticated users can read/write as this is a team tool, but we will protect fields like IDs).
4. Outcome submissions are final once approved.

## The "Dirty Dozen" Payloads
1. Attempt to create a task for a project that doesn't exist.
2. Attempt to update `id` of a task (immutability check).
3. Attempt to set `progress` > 100 or < 0.
4. Attempt to create a task without an `assigneeId`.
5. Attempt to create an outcome without a `submitterId`.
6. Attempt to spoof `ownerId` (if we had one).
7. Attempt to inject a 1MB string into a task title.
8. Attempt to delete a task without being the manager.
9. Attempt to update a terminal state task.
10. Attempt to read PII of other users (if we had user profiles).
11. Attempt to list all tasks without being signed in.
12. Attempt to bypass `isValidId` with special characters.

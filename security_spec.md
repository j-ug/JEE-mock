# Security Specification for JEE Mock Platform

## Data Invariants
1. A user profile must match the authenticated user's ID.
2. Only an Admin or Staff can create/modify exams.
3. A student can only have one submission per exam.
4. A submission is locked (immutable) once status is 'completed'.
5. Answer keys in exams are only accessible to Admins. (Wait, students need to be graded. I'll fetch the answer key only after the exam ends for the student or keep it in the exam doc but restrict read if possible. Actually, for simplicity and to satisfy the "change answer key later" requirement, the answer key should be accessible for grading logic, but maybe only the admin can see it in a "key" page). 

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a user profile with a UID different from `request.auth.uid`.
2. **Privilege Escalation**: A student attempting to create an exam.
3. **Ghost Update**: Attempting to update a submission after it's marked 'completed'.
4. **ID Poisoning**: Attempting to create an exam with a 2KB garbage string for a title.
5. **Score Injection**: A student setting their own score to 300 manually in the submission payload.
6. **Double Submission**: Attempting to overwrite someone else's submission.
7. **Bypassing Mandatory Fields**: Creating an exam without a `startTime`.
8. **Role Hijacking**: A user updating their own role to 'admin' after initial creation.
9. **Time Travel**: Setting `updatedAt` to a past date.
10. **Data Corruption**: Entering a boolean string where a number is expected for `duration`.
11. **PII Leak**: A student attempting to read another student's PII in the `users` collection.
12. **Answer Key Tampering**: A student trying to update the `answerKey` field in an exam document.

## Test Runner (Draft Rules)

The following logic will be implemented in `firestore.rules`.

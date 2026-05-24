# QA Matrix (Phase A)

| ID | Module | Scenario | Expected Result |
| :--- | :--- | :--- | :--- |
| T01 | Auth | Register Retail Buyer | User created in Supabase & local DB; Redirect to dashboard. |
| T02 | Auth | Register Enterprise missing GST | Validation error on GST field. |
| T03 | Auth | Login with valid credentials | Success; JWT/Session set; Role-based redirect. |
| T04 | Routing | Access /admin as Retail Buyer | Blocked; Redirect to dashboard or 403. |
| T05 | Form | Post Problem: Healthcare | Dynamic fields (e.g., Licence No) appear and validate. |
| T06 | Form | Post Problem: Logistics | Dynamic fields (e.g., Weight, Cold Storage) appear. |
| T07 | Compliance| View Vault (New User) | All states show 'Pending' or 'Incomplete'. |
| T08 | Settings | View Buyer Settings | Profile and notification skeleton visible. |
| T09 | Seeding | Run `seed-demo` | 4 roles and initial requirements populated in DB. |
| T10 | Health | API Health Check | Returns 200 OK with version info. |

import { pgTable, text, uuid, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { requirementsTable } from "./requirements";

// Removed duplicate definitions of paymentsTable, workProofsTable, and providerSubscriptionsTable.
// They are defined in their respective specialized schema files.

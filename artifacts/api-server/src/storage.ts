import { db } from "@workspace/db";
import { usersTable, type User, type InsertUser } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function getUserByEmail(email: string): Promise<User | null> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function getUserByStripeCustomerId(customerId: string): Promise<User | null> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.stripeCustomerId, customerId)).limit(1);
  return rows[0] ?? null;
}

export async function getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | null> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.stripeSubscriptionId, subscriptionId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertUser(data: Partial<InsertUser> & { email: string }): Promise<User> {
  const existing = await getUserByEmail(data.email);
  const id = data.id ?? existing?.id ?? `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const [user] = await db
    .insert(usersTable)
    .values({ id, ...data })
    .onConflictDoUpdate({
      target: usersTable.email,
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}

export async function updateUserSubscription(
  email: string,
  data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    stripeProductId?: string;
    subscriptionStatus?: string;
    planId?: string;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  },
): Promise<void> {
  await db
    .update(usersTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(usersTable.email, email));
}

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/generated/client";
import { StripeService } from "@/modules/payment/service/stripe.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { EmailService } from "@/shared/infra/email/email.service";
import { addCalendarMonths } from "./calendar-months";

@Injectable()
export class AccountInactivityService {
  private readonly logger = new Logger(AccountInactivityService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly email: EmailService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

  async run(now = new Date()) {
    let cursor: string | undefined;
    let failures = 0;
    while (true) {
      const users = await this.database.user.findMany({
        where: {
          ...(cursor ? { id: { gt: cursor } } : {}),
          OR: [
            { lastActiveAt: { lte: addCalendarMonths(now, -5) }, inactivityWarnedAt: null },
            { inactivityDeletionAt: { lte: now } },
          ],
        },
        select: { id: true },
        orderBy: { id: "asc" },
        take: 100,
      });
      if (!users.length) break;
      for (const user of users) {
        try {
          await this.processUser(user.id, now);
        } catch (error) {
          failures++;
          this.logger.error(`Account inactivity failed | user=${user.id}`, error);
        }
      }
      cursor = users[users.length - 1].id;
    }
    if (failures) throw new Error(`Account inactivity failed for ${failures} users`);
  }

  async processUser(userId: string, now = new Date()) {
    await this.database.$transaction(
      async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`);
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user || addCalendarMonths(user.lastActiveAt, 5) > now) return;

        if (!user.inactivityWarnedAt) {
          const deletionAt = new Date(
            Math.max(addCalendarMonths(user.lastActiveAt, 6).getTime(), addCalendarMonths(now, 1).getTime()),
          );
          await this.email.sendInactivityWarningEmail({
            name: user.name,
            email: user.email,
            url: this.config.getOrThrow<string>("WEB_URL"),
            deletionDate: deletionAt.toISOString().slice(0, 10),
            idempotencyKey: `inactivity-${user.id}-${user.lastActiveAt.getTime()}`,
          });
          const sentAt = new Date();
          await tx.user.update({
            where: { id: userId },
            data: {
              inactivityWarnedAt: sentAt,
              inactivityDeletionAt: new Date(Math.max(deletionAt.getTime(), addCalendarMonths(sentAt, 1).getTime())),
            },
          });
          return;
        }

        if (
          !user.inactivityDeletionAt ||
          user.inactivityDeletionAt > now ||
          addCalendarMonths(user.lastActiveAt, 6) > now ||
          addCalendarMonths(user.inactivityWarnedAt, 1) > now
        )
          return;

        await this.stripe.cancelSubscriptionsForAccountDeletion(user.stripeCustomerId);
        await tx.user.delete({ where: { id: userId } });
        this.logger.log(`Inactive account deleted | user=${userId}`);
      },
      { timeout: 30_000 },
    );
  }
}

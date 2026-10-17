import { Injectable } from "@nestjs/common";
import { DatabaseService } from "@/shared/infra/database/database.service";

@Injectable()
export class OAuthAppService {
  constructor(private readonly database: DatabaseService) {}

  async list(userId: string) {
    const consents = await this.database.oAuthConsent.findMany({
      where: { userId },
      select: {
        id: true,
        clientId: true,
        scopes: true,
        createdAt: true,
        client: { select: { name: true, uri: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return consents.map(({ client, ...consent }) => ({ ...consent, name: client.name, uri: client.uri }));
  }

  async revoke(userId: string, clientId: string) {
    await this.database.$transaction(async (transaction) => {
      const consent = await transaction.oAuthConsent.findFirst({ where: { userId, clientId } });
      if (!consent) return;

      const revokedAt = new Date();
      await transaction.oAuthRevocation.upsert({
        where: { userId_clientId: { userId, clientId } },
        create: { userId, clientId, revokedAt },
        update: { revokedAt },
      });
      await transaction.oAuthAccessToken.deleteMany({ where: { userId, clientId } });
      await transaction.oAuthRefreshToken.deleteMany({ where: { userId, clientId } });
      await transaction.oAuthConsent.deleteMany({ where: { userId, clientId } });
    });
  }
}

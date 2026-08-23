import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/generated/client";
import { CoinLedgerFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { GetCoinHistoryDto } from "../dto/get-coin-history.dto";
import { GrantCoinsDto } from "../dto/grant-coins.dto";
import { SpendCoinsDto } from "../dto/spend-coins.dto";

const UNIQUE_VIOLATION = "P2002";

export type CoinGrantResult = {
  amount: number;
  balance: number;
};

export type CoinSpendResult = {
  amount: number;
  balance: number;
};

@Injectable()
export class CoinService {
  constructor(private readonly databaseService: DatabaseService) {}

  async grantCoins(grantCoinsDto: GrantCoinsDto): Promise<CoinGrantResult | null> {
    const { userId, reason, sourceKey, amount, metadata } = grantCoinsDto;

    if (amount <= 0) return null;

    return this.databaseService
      .$transaction(async (tx) => {
        await tx.coinLedger.create({
          data: {
            userId,
            reason,
            sourceKey,
            amount,
            ...(metadata && { metadata: { ...metadata } }),
          },
        });

        const wallet = await tx.userWallet.upsert({
          where: { userId },
          create: { userId, balance: amount, lifetimeEarned: amount },
          update: { balance: { increment: amount }, lifetimeEarned: { increment: amount } },
        });

        return { amount, balance: wallet.balance } satisfies CoinGrantResult;
      })
      .catch((error: { code?: string }) => {
        if (error?.code === UNIQUE_VIOLATION) return null;

        throw error;
      });
  }

  async spendCoins(spendCoinsDto: SpendCoinsDto, tx?: Prisma.TransactionClient): Promise<CoinSpendResult | null> {
    const { userId, reason, sourceKey, amount, metadata } = spendCoinsDto;

    if (amount <= 0) return null;

    const run = async (client: Prisma.TransactionClient) => {
      await client.coinLedger.create({
        data: {
          userId,
          reason,
          sourceKey,
          amount: -amount,
          ...(metadata && { metadata: { ...metadata } }),
        },
      });

      const updated = await client.userWallet.updateMany({
        where: { userId, balance: { gte: amount } },
        data: { balance: { decrement: amount }, lifetimeSpent: { increment: amount } },
      });

      if (updated.count === 0) {
        throw new AppException(ERROR_CODES.INSUFFICIENT_BALANCE);
      }

      const wallet = await client.userWallet.findUniqueOrThrow({ where: { userId } });

      return { amount, balance: wallet.balance } satisfies CoinSpendResult;
    };

    const result = tx ? run(tx) : this.databaseService.$transaction(run);

    return result.catch((error: { code?: string }) => {
      if (error?.code === UNIQUE_VIOLATION) return null;

      throw error;
    });
  }

  async getWalletByUserId(userId: string) {
    const wallet = await this.databaseService.userWallet.findUnique({ where: { userId } });

    return {
      balance: wallet?.balance ?? 0,
      lifetimeEarned: wallet?.lifetimeEarned ?? 0,
      lifetimeSpent: wallet?.lifetimeSpent ?? 0,
    };
  }

  async getCoinHistory(userId: string, getCoinHistoryDto: GetCoinHistoryDto) {
    return this.databaseService.offsetPagination<CoinLedgerFindManyArgs>({
      model: "coinLedger",
      page: getCoinHistoryDto.page,
      itemsPerPage: getCoinHistoryDto.itemsPerPage,
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}

import { Controller, Delete, Get, HttpCode, Param, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { OAuthAppService } from "../service/oauth-app.service";

@ApiTags("OAuth applications")
@Controller("/integrations/apps")
@UseGuards(AuthGuard)
export class OAuthAppController {
  constructor(private readonly apps: OAuthAppService) {}

  @Get()
  async list(@Session() session: UserSession) {
    return { apps: await this.apps.list(session.user.id) };
  }

  @Delete("/:clientId")
  @HttpCode(204)
  async revoke(@Session() session: UserSession, @Param("clientId") clientId: string) {
    await this.apps.revoke(session.user.id, clientId);
  }
}

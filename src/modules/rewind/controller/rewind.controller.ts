import { Controller, Get, Header, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { RewindService } from "../service/rewind.service";

@ApiTags("Replay")
@Controller("/rewind/2026")
export class RewindController {
  constructor(private readonly rewind: RewindService) {}

  @Get("/me")
  @UseGuards(AuthGuard)
  @Header("Cache-Control", "private, no-store")
  async getPersonal(@Session() session: UserSession) {
    return { rewind: await this.rewind.getPersonal(session.user.id) };
  }

  @Get("/global")
  @Header("Cache-Control", "public, max-age=300")
  async getGlobal() {
    return { rewind: await this.rewind.getGlobal() };
  }
}

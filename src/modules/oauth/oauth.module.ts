import { Module } from "@nestjs/common";
import { OAuthAppController } from "./controller/oauth-app.controller";
import { OAuthMetadataController } from "./controller/oauth-metadata.controller";
import { OAuthAppService } from "./service/oauth-app.service";
import { OAuthTokenService } from "./service/oauth-token.service";

@Module({
  controllers: [OAuthAppController, OAuthMetadataController],
  providers: [OAuthAppService, OAuthTokenService],
  exports: [OAuthTokenService],
})
export class OAuthModule {}

import { Global, Module } from "@nestjs/common";

import { UserService } from "./service/user.service";

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

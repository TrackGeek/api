import { Global, Module } from "@nestjs/common";

import { UserService } from "./service/user.service";
import { UserController } from "./controller/user.controller";

@Global()
@Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

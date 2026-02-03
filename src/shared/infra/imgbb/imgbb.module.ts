import { Global, Module } from "@nestjs/common";

import { ImgBBService } from "./imgbb.service";

@Global()
@Module({
	imports: [],
	providers: [ImgBBService],
	exports: [ImgBBService],
})
export class ImgBBModule {}

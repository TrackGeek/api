import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { ImgBBService } from "./imgbb.service";

@Module({
	imports: [HttpModule, ConfigModule],
	providers: [ImgBBService],
	exports: [ImgBBService],
})
export class ImgBBModule { }

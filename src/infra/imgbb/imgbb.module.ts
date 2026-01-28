import { Module } from "@nestjs/common";
import { ImgBBService } from "./imgbb.service";
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [HttpModule],
	providers: [ImgBBService],
	exports: [ImgBBService],
})
export class ImgBBModule {}

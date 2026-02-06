import { Injectable } from "@nestjs/common";

import type { SearchTVShowDto } from "./dtos/search-tv-show.dto";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";

@Injectable()
export class TVShowService {
	constructor(private readonly integrationsService: IntegrationsService) {}

	async searchTVShows(searchTVShowDto: SearchTVShowDto) {
		return this.integrationsService.tmdb.searchTVShows(searchTVShowDto.query);
	}
}

import { Injectable } from "@nestjs/common";

import type { SearchMovieDto } from "./dtos/search-movie.dto";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";

@Injectable()
export class MovieService {
	constructor(private readonly integrationsService: IntegrationsService) {}

	async searchMovies(searchMovieDto: SearchMovieDto) {
		return this.integrationsService.tmdb.searchMovies(searchMovieDto.query);
	}
}

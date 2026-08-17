import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SearchPersonDto } from "../dto/search-person.dto";
import { PersonService } from "../service/person.service";

@ApiTags("Person")
@Controller("/person")
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  @Get("/search")
  async searchPeople(@Query() searchPersonDto: SearchPersonDto) {
    const people = await this.personService.searchPeople(searchPersonDto);

    return { people };
  }

  @Get("/:slug")
  async getPersonBySlug(@Param("slug") slug: string) {
    const person = await this.personService.getPersonBySlug(slug);

    return { person };
  }
}

import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PersonService } from "../service/person.service";

@ApiTags("Person")
@Controller("/person")
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  @Get("/:slug")
  async getPersonBySlug(@Param("slug") slug: string) {
    const person = await this.personService.getPersonBySlug(slug);

    return { person };
  }
}

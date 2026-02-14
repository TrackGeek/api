import { DatabaseArgs } from '../database.service';

export class PaginationParamsDto<Args extends DatabaseArgs> {
  readonly omit?: Args["omit"];

  readonly where?: Args["where"];

  readonly include?: Args["include"];

  readonly orderBy?: Args["orderBy"];
  
  readonly select?: Args["select"];
}

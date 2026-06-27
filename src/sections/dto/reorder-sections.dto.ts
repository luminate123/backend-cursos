import { IsArray, IsUUID } from 'class-validator';

export class ReorderSectionsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  orderedIds: string[];
}

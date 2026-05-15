import { IsEnum } from 'class-validator';
import { Role } from '../../enums/role.enum';

export class UpdateRoleDto {
  @IsEnum(Role)
  role: Role;
}
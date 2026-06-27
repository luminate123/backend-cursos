import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';
import { Requester } from '../common/course-access.service';

@Controller('courses/:courseId/sections')
export class SectionsController {
  constructor(private sectionsService: SectionsService) {}

  // Public + optional auth: protected lesson fields redacted for non-enrolled.
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Param('courseId') courseId: string, @CurrentUser() user?: Requester) {
    return this.sectionsService.findByCourse(courseId, user);
  }

  @Post()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateSectionDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.sectionsService.create(courseId, dto, userId, userRole);
  }

  @Put('reorder')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  reorder(
    @Param('courseId') courseId: string,
    @Body() dto: ReorderSectionsDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.sectionsService.reorder(courseId, dto.orderedIds, userId, userRole);
  }

  @Put(':id')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSectionDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.sectionsService.update(id, dto, userId, userRole);
  }

  @Delete(':id')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.sectionsService.remove(id, userId, userRole);
  }
}

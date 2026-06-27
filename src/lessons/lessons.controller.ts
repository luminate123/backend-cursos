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
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';
import { Requester } from '../common/course-access.service';

@Controller('sections/:sectionId/lessons')
export class LessonsController {
  constructor(private lessonsService: LessonsService) {}

  // Public + optional auth: protected fields redacted for non-enrolled viewers.
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Param('sectionId') sectionId: string, @CurrentUser() user?: Requester) {
    return this.lessonsService.findBySection(sectionId, user);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: Requester) {
    return this.lessonsService.findOne(id, user);
  }

  @Post()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  create(
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.lessonsService.create(sectionId, dto, userId, userRole);
  }

  @Put('reorder')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  reorder(
    @Param('sectionId') sectionId: string,
    @Body() dto: ReorderLessonsDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.lessonsService.reorder(sectionId, dto.orderedIds, userId, userRole);
  }

  @Put(':id')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.lessonsService.update(id, dto, userId, userRole);
  }

  @Delete(':id')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.lessonsService.remove(id, userId, userRole);
  }
}

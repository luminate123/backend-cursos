import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@Controller('sections/:sectionId/lessons')
export class LessonsController {
  constructor(private lessonsService: LessonsService) {}

  @Public()
  @Get()
  findAll(@Param('sectionId') sectionId: string) {
    return this.lessonsService.findBySection(sectionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lessonsService.findOne(id);
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
    @Body() body: { orderedIds: string[] },
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.lessonsService.reorder(sectionId, body.orderedIds, userId, userRole);
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

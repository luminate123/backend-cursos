import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@Controller('courses')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  // Public: list published courses
  @Public()
  @Get()
  findAll(@Query() query: QueryCoursesDto) {
    return this.coursesService.findAll(query);
  }

  // Public: get single course with roadmap
  @Public()
  @Get(':slugOrId')
  findOne(@Param('slugOrId') slugOrId: string) {
    return this.coursesService.findOne(slugOrId);
  }

  // Instructor/Admin: get my courses
  @Get('instructor/my')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  findMyCourses(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryCoursesDto,
  ) {
    return this.coursesService.findByInstructor(userId, query);
  }

  // Instructor/Admin: create course
  @Post()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  create(
    @Body() dto: CreateCourseDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.coursesService.create(dto, userId);
  }

  // Instructor/Admin: update course
  @Put(':id')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.coursesService.update(id, dto, userId, userRole);
  }

  // Instructor/Admin: publish/unpublish
  @Patch(':id/publish')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  publish(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.coursesService.publish(id, userId, userRole);
  }

  // Instructor/Admin: delete course
  @Delete(':id')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.coursesService.remove(id, userId, userRole);
  }
}

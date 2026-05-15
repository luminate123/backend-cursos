import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Role } from '../enums/role.enum';
import { EnrollmentStatus } from '../entities/enrollment.entity';

@Controller()
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private enrollmentsService: EnrollmentsService) {}

  // ─── Student endpoints ───────────────────────────────────────────────────────

  // Student: request enrollment in a course
  @Post('courses/:courseId/enroll')
  requestEnrollment(
    @Param('courseId') courseId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.enrollmentsService.requestEnrollment(courseId, userId);
  }

  // Student: cancel pending enrollment request
  @Delete('courses/:courseId/enroll')
  cancelRequest(
    @Param('courseId') courseId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.enrollmentsService.cancelRequest(courseId, userId);
  }

  // Student: get my enrollments
  @Get('enrollments/my')
  getMyEnrollments(@CurrentUser('sub') userId: string) {
    return this.enrollmentsService.getMyEnrollments(userId);
  }

  // Student: get enrollment detail for a specific course
  @Get('courses/:courseId/enrollment')
  getEnrollment(
    @Param('courseId') courseId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.enrollmentsService.getEnrollment(courseId, userId);
  }

  // Student: mark lesson as complete (only if APPROVED)
  @Post('lessons/:lessonId/complete')
  completeLesson(
    @Param('lessonId') lessonId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.enrollmentsService.completeLesson(lessonId, userId);
  }

  // Student: get completed lessons for a course
  @Get('courses/:courseId/progress')
  getProgress(
    @Param('courseId') courseId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.enrollmentsService.getCompletedLessons(courseId, userId);
  }

  // ─── Instructor / Admin endpoints ────────────────────────────────────────────

  // Instructor: get all enrollment requests for a course (filterable by status)
  @Get('courses/:courseId/enrollments')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  getCourseEnrollments(
    @Param('courseId') courseId: string,
    @CurrentUser('sub') instructorId: string,
    @CurrentUser('role') instructorRole: Role,
    @Query('status') status?: EnrollmentStatus,
  ) {
    return this.enrollmentsService.getCourseEnrollments(
      courseId,
      instructorId,
      instructorRole,
      status,
    );
  }

  // Instructor: manually enroll a student (auto-approved)
  @Post('courses/:courseId/enrollments/student/:studentId')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  manualEnroll(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
    @CurrentUser('sub') instructorId: string,
    @CurrentUser('role') instructorRole: Role,
  ) {
    return this.enrollmentsService.manualEnroll(
      courseId,
      studentId,
      instructorId,
      instructorRole,
    );
  }

  // Instructor: approve enrollment request
  @Post('enrollments/:enrollmentId/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  approve(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser('sub') instructorId: string,
    @CurrentUser('role') instructorRole: Role,
  ) {
    return this.enrollmentsService.approve(enrollmentId, instructorId, instructorRole);
  }

  // Instructor: reject enrollment request
  @Post('enrollments/:enrollmentId/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  reject(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser('sub') instructorId: string,
    @CurrentUser('role') instructorRole: Role,
    @Body('reason') reason?: string,
  ) {
    return this.enrollmentsService.reject(enrollmentId, instructorId, instructorRole, reason);
  }
}

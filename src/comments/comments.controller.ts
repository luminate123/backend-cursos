import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';

@Controller('courses/:courseId/comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Public()
  @Get()
  findAll(@Param('courseId') courseId: string) {
    return this.commentsService.findByCourse(courseId);
  }

  @Post()
  create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.commentsService.create(courseId, userId, dto);
  }
}

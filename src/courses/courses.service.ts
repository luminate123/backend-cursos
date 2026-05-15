import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Course } from '../entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { Role } from '../enums/role.enum';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let count = 0;
    while (true) {
      const existing = await this.courseRepository.findOne({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      count++;
      slug = `${baseSlug}-${count}`;
    }
  }

  async create(dto: CreateCourseDto, instructorId: string): Promise<Course> {
    const baseSlug = this.generateSlug(dto.title);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const course = this.courseRepository.create({
      ...dto,
      slug,
      instructorId,
    });
    return this.courseRepository.save(course);
  }

  async findAll(query: QueryCoursesDto) {
    const page = Math.max(1, parseInt(query.page || '1') || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '12') || 12));
    const skip = (page - 1) * limit;

    const qb = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .where('course.isPublished = :published', { published: true })
      .select([
        'course.id', 'course.title', 'course.slug', 'course.shortDescription',
        'course.thumbnail', 'course.level', 'course.category', 'course.language',
        'course.price', 'course.totalDurationSeconds', 'course.totalLessons',
        'course.rating', 'course.ratingCount', 'course.enrollmentCount',
        'course.createdAt',
        'instructor.id', 'instructor.firstName', 'instructor.lastName', 'instructor.avatar',
      ]);

    if (query.search) {
      qb.andWhere('(course.title ILIKE :search OR course.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.category) qb.andWhere('course.category = :category', { category: query.category });
    if (query.level) qb.andWhere('course.level = :level', { level: query.level });
    if (query.language) qb.andWhere('course.language = :language', { language: query.language });

    qb.orderBy('course.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(slugOrId: string): Promise<Course> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

    const course = await this.courseRepository.findOne({
      where: isUuid
        ? [{ slug: slugOrId }, { id: slugOrId }]
        : { slug: slugOrId },
      relations: ['instructor', 'sections', 'sections.lessons'],
      order: { sections: { order: 'ASC', lessons: { order: 'ASC' } } },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async findByInstructor(instructorId: string, query: QueryCoursesDto) {
    const page = Math.max(1, parseInt(query.page || '1') || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '12') || 12));

    const [data, total] = await this.courseRepository.findAndCount({
      where: { instructorId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { total, page, limit, lastPage: Math.ceil(total / limit) } };
  }

  async update(id: string, dto: UpdateCourseDto, userId: string, userRole: Role): Promise<Course> {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    this.checkOwnership(course, userId, userRole);

    if (dto.title && dto.title !== course.title) {
      const baseSlug = this.generateSlug(dto.title);
      course.slug = await this.ensureUniqueSlug(baseSlug, id);
    }

    Object.assign(course, dto);
    return this.courseRepository.save(course);
  }

  async publish(id: string, userId: string, userRole: Role): Promise<Course> {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    this.checkOwnership(course, userId, userRole);
    course.isPublished = !course.isPublished;
    return this.courseRepository.save(course);
  }

  async remove(id: string, userId: string, userRole: Role): Promise<void> {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    this.checkOwnership(course, userId, userRole);
    await this.courseRepository.remove(course);
  }

  async updateStats(courseId: string): Promise<void> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['sections', 'sections.lessons'],
    });
    if (!course) return;

    let totalLessons = 0;
    let totalDurationSeconds = 0;

    for (const section of course.sections) {
      totalLessons += section.lessons?.length ?? 0;
      for (const lesson of section.lessons ?? []) {
        totalDurationSeconds += lesson.durationSeconds ?? 0;
      }
    }

    await this.courseRepository.update(courseId, { totalLessons, totalDurationSeconds });
  }

  private checkOwnership(course: Course, userId: string, userRole: Role): void {
    if (userRole !== Role.ADMIN && course.instructorId !== userId) {
      throw new ForbiddenException('You do not own this course');
    }
  }
}

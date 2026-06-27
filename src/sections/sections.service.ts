import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Section } from '../entities/section.entity';
import { Course } from '../entities/course.entity';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { Role } from '../enums/role.enum';
import { CourseAccessService, Requester } from '../common/course-access.service';

@Injectable()
export class SectionsService {
  constructor(
    @InjectRepository(Section)
    private sectionRepository: Repository<Section>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    private courseAccess: CourseAccessService,
  ) {}

  async create(courseId: string, dto: CreateSectionDto, userId: string, userRole: Role): Promise<Section> {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.checkOwnership(course, userId, userRole);

    // Auto-assign order if not provided
    if (dto.order === undefined) {
      const count = await this.sectionRepository.count({ where: { courseId } });
      dto.order = count;
    }

    const section = this.sectionRepository.create({ ...dto, courseId });
    return this.sectionRepository.save(section);
  }

  async findByCourse(courseId: string, requester?: Requester): Promise<Section[]> {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const fullAccess = await this.courseAccess.hasFullAccess(course, requester);
    if (!course.isPublished && !fullAccess) {
      throw new NotFoundException('Course not found');
    }

    const sections = await this.sectionRepository.find({
      where: { courseId },
      relations: ['lessons'],
      order: { order: 'ASC', lessons: { order: 'ASC' } },
    });
    for (const section of sections) {
      this.courseAccess.redactLessons(section.lessons, fullAccess);
    }
    return sections;
  }

  async update(id: string, dto: UpdateSectionDto, userId: string, userRole: Role): Promise<Section> {
    const section = await this.sectionRepository.findOne({
      where: { id },
      relations: ['course'],
    });
    if (!section) throw new NotFoundException('Section not found');
    this.checkOwnership(section.course, userId, userRole);

    Object.assign(section, dto);
    return this.sectionRepository.save(section);
  }

  async reorder(courseId: string, orderedIds: string[], userId: string, userRole: Role): Promise<Section[]> {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.checkOwnership(course, userId, userRole);

    // Only reorder sections that belong to this course.
    const courseSectionIds = new Set(
      (await this.sectionRepository.find({ where: { courseId }, select: ['id'] })).map((s) => s.id),
    );

    await Promise.all(
      orderedIds
        .filter((id) => courseSectionIds.has(id))
        .map((id, index) => this.sectionRepository.update(id, { order: index })),
    );

    return this.sectionRepository.find({
      where: { courseId },
      relations: ['lessons'],
      order: { order: 'ASC', lessons: { order: 'ASC' } },
    });
  }

  async remove(id: string, userId: string, userRole: Role): Promise<void> {
    const section = await this.sectionRepository.findOne({
      where: { id },
      relations: ['course'],
    });
    if (!section) throw new NotFoundException('Section not found');
    this.checkOwnership(section.course, userId, userRole);
    await this.sectionRepository.remove(section);
  }

  private checkOwnership(course: Course, userId: string, userRole: Role): void {
    if (userRole !== Role.ADMIN && course.instructorId !== userId) {
      throw new ForbiddenException('You do not own this course');
    }
  }
}

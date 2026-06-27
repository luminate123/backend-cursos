import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '../entities/lesson.entity';
import { Section } from '../entities/section.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Role } from '../enums/role.enum';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(Section)
    private sectionRepository: Repository<Section>,
    private uploadsService: UploadsService,
  ) {}

  private extractYoutubeId(url: string): string | null {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  async create(sectionId: string, dto: CreateLessonDto, userId: string, userRole: Role): Promise<Lesson> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course'],
    });
    if (!section) throw new NotFoundException('Section not found');
    this.checkOwnership(section, userId, userRole);

    if (dto.order === undefined) {
      const count = await this.lessonRepository.count({ where: { sectionId } });
      dto.order = count;
    }

    const youtubeVideoId = this.extractYoutubeId(dto.youtubeUrl);
    const lesson = this.lessonRepository.create({ ...dto, sectionId, youtubeVideoId });
    const saved = await this.lessonRepository.save(lesson);

    await this.updateSectionStats(sectionId);
    return saved;
  }

  async findBySection(sectionId: string): Promise<Lesson[]> {
    return this.lessonRepository.find({
      where: { sectionId },
      order: { order: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  async update(id: string, dto: UpdateLessonDto, userId: string, userRole: Role): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['section', 'section.course'],
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    this.checkOwnership(lesson.section, userId, userRole);

    if (dto.youtubeUrl) {
      (dto as any).youtubeVideoId = this.extractYoutubeId(dto.youtubeUrl);
    }

    Object.assign(lesson, dto);
    const saved = await this.lessonRepository.save(lesson);
    await this.updateSectionStats(lesson.sectionId);
    return saved;
  }

  async reorder(sectionId: string, orderedIds: string[], userId: string, userRole: Role): Promise<Lesson[]> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course'],
    });
    if (!section) throw new NotFoundException('Section not found');
    this.checkOwnership(section, userId, userRole);

    await Promise.all(
      orderedIds.map((id, index) =>
        this.lessonRepository.update(id, { order: index }),
      ),
    );

    return this.findBySection(sectionId);
  }

  async remove(id: string, userId: string, userRole: Role): Promise<void> {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['section', 'section.course'],
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    this.checkOwnership(lesson.section, userId, userRole);
    const sectionId = lesson.sectionId;

    // Purge uploaded resources from R2 (best-effort, don't block deletion)
    for (const r of lesson.resources ?? []) {
      await this.uploadsService.deleteByUrl(r.url).catch(() => undefined);
    }

    await this.lessonRepository.remove(lesson);
    await this.updateSectionStats(sectionId);
  }

  private async updateSectionStats(sectionId: string): Promise<void> {
    const lessons = await this.lessonRepository.find({ where: { sectionId } });
    const totalLessons = lessons.length;
    const totalDurationSeconds = lessons.reduce((sum, l) => sum + (l.durationSeconds ?? 0), 0);
    await this.sectionRepository.update(sectionId, { totalLessons, totalDurationSeconds });
  }

  private checkOwnership(section: Section, userId: string, userRole: Role): void {
    if (userRole !== Role.ADMIN && section.course?.instructorId !== userId) {
      throw new ForbiddenException('You do not own this course');
    }
  }
}

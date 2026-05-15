import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course.entity';
import { Enrollment, EnrollmentStatus } from '../entities/enrollment.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from '../enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, refreshTokens, ...result } = user;
    return result;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.userRepository.update(userId, dto);
    return this.getProfile(userId);
  }

  async findAll(page: number = 1, limit: number = 10) {
    const [users, total] = await this.userRepository.findAndCount({
      select: ['id', 'email', 'firstName', 'lastName', 'avatar', 'role', 'isActive', 'isEmailVerified', 'createdAt', 'updatedAt'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return {
      data: users,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async updateRole(userId: string, dto: UpdateRoleDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.role = dto.role;
    await this.userRepository.save(user);
    const { password, refreshTokens, ...result } = user;
    return result;
  }

  async softDelete(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.isActive = false;
    await this.userRepository.save(user);
    const { password, refreshTokens, ...result } = user;
    return result;
  }

  async findById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async getAdminStats() {
    // ── User counts by role ────────────────────────────────────────────────────
    const [students, instructors, admins] = await Promise.all([
      this.userRepository.count({ where: { role: Role.STUDENT } }),
      this.userRepository.count({ where: { role: Role.INSTRUCTOR } }),
      this.userRepository.count({ where: { role: Role.ADMIN } }),
    ]);

    // ── Course counts ──────────────────────────────────────────────────────────
    const [totalCourses, publishedCourses] = await Promise.all([
      this.courseRepository.count(),
      this.courseRepository.count({ where: { isPublished: true } }),
    ]);

    // ── Enrollment counts by status ────────────────────────────────────────────
    const [approved, pending, rejected] = await Promise.all([
      this.enrollmentRepository.count({ where: { status: EnrollmentStatus.APPROVED } }),
      this.enrollmentRepository.count({ where: { status: EnrollmentStatus.PENDING } }),
      this.enrollmentRepository.count({ where: { status: EnrollmentStatus.REJECTED } }),
    ]);

    // ── Top 5 courses by approved students ────────────────────────────────────
    const topCourses = await this.enrollmentRepository
      .createQueryBuilder('e')
      .select('course.id', 'id')
      .addSelect('course.title', 'title')
      .addSelect('course.slug', 'slug')
      .addSelect('course.thumbnail', 'thumbnail')
      .addSelect('COUNT(e.id)', 'studentCount')
      .innerJoin('e.course', 'course')
      .where('e.status = :status', { status: EnrollmentStatus.APPROVED })
      .groupBy('course.id, course.title, course.slug, course.thumbnail')
      .orderBy('COUNT(e.id)', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      users: {
        total: students + instructors + admins,
        students,
        instructors,
        admins,
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
        drafts: totalCourses - publishedCourses,
      },
      enrollments: {
        total: approved + pending + rejected,
        approved,
        pending,
        rejected,
      },
      topCourses: topCourses.map((tc) => ({
        id: tc.id,
        title: tc.title,
        slug: tc.slug,
        thumbnail: tc.thumbnail,
        studentCount: parseInt(tc.studentCount, 10),
      })),
    };
  }
}
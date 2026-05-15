import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateCoursesTables1710000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`CREATE TYPE "course_level_enum" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED')`);
    await queryRunner.query(`CREATE TYPE "course_category_enum" AS ENUM('PROGRAMMING','DESIGN','BUSINESS','MARKETING','PHOTOGRAPHY','MUSIC','HEALTH','OTHER')`);

    // courses
    await queryRunner.createTable(
      new Table({
        name: 'courses',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'title', type: 'varchar' },
          { name: 'slug', type: 'varchar', isUnique: true },
          { name: 'description', type: 'text' },
          { name: 'shortDescription', type: 'varchar', isNullable: true },
          { name: 'thumbnail', type: 'varchar', isNullable: true },
          { name: 'promoVideoUrl', type: 'varchar', isNullable: true },
          { name: 'level', type: 'course_level_enum', default: `'BEGINNER'` },
          { name: 'category', type: 'course_category_enum', default: `'OTHER'` },
          { name: 'language', type: 'varchar', default: `'es'` },
          { name: 'price', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'isPublished', type: 'boolean', default: false },
          { name: 'requirements', type: 'text', isNullable: true },
          { name: 'whatYouLearn', type: 'text', isNullable: true },
          { name: 'tags', type: 'text', isNullable: true },
          { name: 'totalDurationSeconds', type: 'int', default: 0 },
          { name: 'totalLessons', type: 'int', default: 0 },
          { name: 'rating', type: 'decimal', precision: 3, scale: 2, default: 0 },
          { name: 'ratingCount', type: 'int', default: 0 },
          { name: 'enrollmentCount', type: 'int', default: 0 },
          { name: 'instructorId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'courses',
      new TableForeignKey({
        columnNames: ['instructorId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex('courses', new TableIndex({ columnNames: ['slug'] }));
    await queryRunner.createIndex('courses', new TableIndex({ columnNames: ['instructorId'] }));
    await queryRunner.createIndex('courses', new TableIndex({ columnNames: ['isPublished'] }));
    await queryRunner.createIndex('courses', new TableIndex({ columnNames: ['category'] }));

    // sections
    await queryRunner.createTable(
      new Table({
        name: 'sections',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'title', type: 'varchar' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'order', type: 'int', default: 0 },
          { name: 'totalLessons', type: 'int', default: 0 },
          { name: 'totalDurationSeconds', type: 'int', default: 0 },
          { name: 'courseId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'sections',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex('sections', new TableIndex({ columnNames: ['courseId', 'order'] }));

    // lessons
    await queryRunner.createTable(
      new Table({
        name: 'lessons',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'title', type: 'varchar' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'youtubeUrl', type: 'varchar' },
          { name: 'youtubeVideoId', type: 'varchar', isNullable: true },
          { name: 'order', type: 'int', default: 0 },
          { name: 'durationSeconds', type: 'int', isNullable: true },
          { name: 'isFree', type: 'boolean', default: false },
          { name: 'resources', type: 'jsonb', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'sectionId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'lessons',
      new TableForeignKey({
        columnNames: ['sectionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sections',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex('lessons', new TableIndex({ columnNames: ['sectionId', 'order'] }));

    // enrollments
    await queryRunner.createTable(
      new Table({
        name: 'enrollments',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'uuid' },
          { name: 'courseId', type: 'uuid' },
          { name: 'progressPercentage', type: 'int', default: 0 },
          { name: 'completedLessons', type: 'int', default: 0 },
          { name: 'lastAccessedAt', type: 'timestamp', isNullable: true },
          { name: 'completedAt', type: 'timestamp', isNullable: true },
          { name: 'enrolledAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
        uniques: [{ columnNames: ['userId', 'courseId'] }],
      }),
      true,
    );

    await queryRunner.createForeignKey('enrollments', new TableForeignKey({ columnNames: ['userId'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('enrollments', new TableForeignKey({ columnNames: ['courseId'], referencedColumnNames: ['id'], referencedTableName: 'courses', onDelete: 'CASCADE' }));
    await queryRunner.createIndex('enrollments', new TableIndex({ columnNames: ['userId'] }));
    await queryRunner.createIndex('enrollments', new TableIndex({ columnNames: ['courseId'] }));

    // lesson_progress
    await queryRunner.createTable(
      new Table({
        name: 'lesson_progress',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'uuid' },
          { name: 'lessonId', type: 'uuid' },
          { name: 'completedAt', type: 'timestamp', default: 'now()' },
        ],
        uniques: [{ columnNames: ['userId', 'lessonId'] }],
      }),
      true,
    );

    await queryRunner.createForeignKey('lesson_progress', new TableForeignKey({ columnNames: ['userId'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('lesson_progress', new TableForeignKey({ columnNames: ['lessonId'], referencedColumnNames: ['id'], referencedTableName: 'lessons', onDelete: 'CASCADE' }));
    await queryRunner.createIndex('lesson_progress', new TableIndex({ columnNames: ['userId', 'lessonId'] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('lesson_progress');
    await queryRunner.dropTable('enrollments');
    await queryRunner.dropTable('lessons');
    await queryRunner.dropTable('sections');
    await queryRunner.dropTable('courses');
    await queryRunner.query(`DROP TYPE "course_category_enum"`);
    await queryRunner.query(`DROP TYPE "course_level_enum"`);
  }
}

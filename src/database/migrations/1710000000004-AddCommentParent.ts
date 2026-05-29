import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddCommentParent1710000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'comments',
      new TableColumn({ name: 'parentId', type: 'uuid', isNullable: true }),
    );

    await queryRunner.createForeignKey(
      'comments',
      new TableForeignKey({
        columnNames: ['parentId'],
        referencedTableName: 'comments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('comments');
    const fk = table!.foreignKeys.find((f) => f.columnNames.includes('parentId'));
    if (fk) await queryRunner.dropForeignKey('comments', fk);
    await queryRunner.dropColumn('comments', 'parentId');
  }
}

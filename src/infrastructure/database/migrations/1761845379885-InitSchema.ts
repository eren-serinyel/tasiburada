import { MigrationInterface, QueryRunner } from "typeorm";

// No-op migration kept for history compatibility. Actual schema will be created by a newer migration.
export class InitSchema1761845379885 implements MigrationInterface {
    name = 'InitSchema1761845379885'

    public async up(_queryRunner: QueryRunner): Promise<void> {
        // intentionally left empty
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // intentionally left empty
    }
}

import { MigrationInterface, QueryRunner } from "typeorm";

export class CarriersVehicleTypesNullable1762000000002 implements MigrationInterface {
    name = 'CarriersVehicleTypesNullable1762000000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasCol = await queryRunner.query(`SHOW COLUMNS FROM \`carriers\` LIKE 'vehicleTypes'`);
        if (hasCol && hasCol.length > 0) {
            await queryRunner.query(`ALTER TABLE \`carriers\` MODIFY \`vehicleTypes\` JSON NULL`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasCol = await queryRunner.query(`SHOW COLUMNS FROM \`carriers\` LIKE 'vehicleTypes'`);
        if (hasCol && hasCol.length > 0) {
            await queryRunner.query(`ALTER TABLE \`carriers\` MODIFY \`vehicleTypes\` JSON NOT NULL`);
        }
    }
}

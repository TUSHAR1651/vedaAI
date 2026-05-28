import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Assignment, AssignmentSchema } from './entities/assignment.entity';
import { GeneratedPaper, GeneratedPaperSchema } from './entities/generated-paper.entity';

/**
 * Registers the Mongo models once and re-exports them. Any module that needs
 * to inject `Assignment` / `GeneratedPaper` imports this, which keeps model
 * registration in a single place and avoids circular module dependencies.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Assignment.name, schema: AssignmentSchema },
      { name: GeneratedPaper.name, schema: GeneratedPaperSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class AssignmentMongooseModule {}

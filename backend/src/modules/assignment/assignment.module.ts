import { Module } from '@nestjs/common';
import { AssignmentMongooseModule } from './assignment.mongoose';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { PdfModule } from '../pdf/pdf.module';

/**
 * HTTP surface for assignments + paper retrieval + action-bar triggers.
 * Imports PdfModule so the controller can expose the async export endpoint.
 */
@Module({
  imports: [AssignmentMongooseModule, PdfModule],
  providers: [AssignmentService],
  controllers: [AssignmentController],
  exports: [AssignmentService],
})
export class AssignmentModule {}

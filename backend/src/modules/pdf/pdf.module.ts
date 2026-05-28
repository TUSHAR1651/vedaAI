import { Module } from '@nestjs/common';
import { AssignmentMongooseModule } from '../assignment/assignment.mongoose';
import { WebsocketModule } from '../../websocket/websocket.module';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import { PdfGenerationProcessor } from '../../workers/pdf-generation.processor';

/**
 * PDF text extraction (upload) + async PDF export (worker). Exports PdfService
 * so the AssignmentController can expose the export trigger.
 */
@Module({
  imports: [AssignmentMongooseModule, WebsocketModule],
  providers: [PdfService, PdfGenerationProcessor],
  controllers: [PdfController],
  exports: [PdfService],
})
export class PdfModule {}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CreateAssignmentInput,
  createAssignmentSchema,
} from '../../schemas/create-assignment.schema';
import { PdfService } from '../pdf/pdf.service';

@Controller('assignments')
export class AssignmentController {
  constructor(
    private readonly assignments: AssignmentService,
    private readonly pdf: PdfService,
  ) {}

  /** Create assignment -> persist -> enqueue generation. Returns immediately. */
  @Post()
  create(@Body(new ZodValidationPipe(createAssignmentSchema)) body: CreateAssignmentInput) {
    return this.assignments.create(body);
  }

  @Get()
  list() {
    return this.assignments.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assignments.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assignments.remove(id);
  }

  @Get(':id/status')
  status(@Param('id') id: string) {
    return this.assignments.getStatus(id);
  }

  @Get(':id/paper')
  paper(@Param('id') id: string) {
    return this.assignments.getPaper(id);
  }

  /** Action bar: Regenerate Paper. */
  @Post(':id/regenerate')
  regenerate(@Param('id') id: string) {
    return this.assignments.regeneratePaper(id);
  }

  /** Action bar: Regenerate Section. */
  @Post(':id/sections/:index/regenerate')
  regenerateSection(@Param('id') id: string, @Param('index', ParseIntPipe) index: number) {
    return this.assignments.regenerateSection(id, index);
  }

  /** Request an async PDF export for this assignment's paper. */
  @Post(':id/pdf')
  exportPdf(@Param('id') id: string) {
    return this.pdf.requestExport(id);
  }
}

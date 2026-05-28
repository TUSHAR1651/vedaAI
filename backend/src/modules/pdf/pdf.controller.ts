import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { PdfService } from './pdf.service';

@Controller('pdf')
export class PdfController {
  constructor(private readonly pdf: PdfService) {}

  /**
   * Extract text from an uploaded reference file (optional PDF/text upload on
   * the create form). Returns the text the frontend then submits as
   * `sourceMaterial` with the assignment.
   */
  @Post('extract-text')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
    }),
  )
  extractText(@UploadedFile() file: Express.Multer.File) {
    return this.pdf.extractText(file);
  }

  /** Download a previously generated PDF. */
  @Get('file/:fileName')
  async download(@Param('fileName') fileName: string, @Res() res: Response) {
    if (!(await this.pdf.fileExists(fileName))) {
      throw new NotFoundException('PDF not found');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(this.pdf.resolveFilePath(fileName));
  }
}

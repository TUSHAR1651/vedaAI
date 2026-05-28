import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { RealtimeService } from './realtime.service';

/**
 * Exposes the gateway + realtime funnel to any module that needs to push
 * updates (generation workers, pdf worker, generation service).
 */
@Module({
  providers: [EventsGateway, RealtimeService],
  exports: [EventsGateway, RealtimeService],
})
export class WebsocketModule {}

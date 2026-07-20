import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller.js";
import { AUTH_CLOCK, AuthService } from "./auth.service.js";
import { SessionAuthGuard } from "./session-auth.guard.js";

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionAuthGuard,
    {
      provide: AUTH_CLOCK,
      useValue: () => Date.now(),
    },
  ],
  exports: [AuthService, SessionAuthGuard],
})
export class AuthModule {}

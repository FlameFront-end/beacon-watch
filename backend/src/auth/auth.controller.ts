import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";

import { AuthService } from "./auth.service.js";
import {
  SessionAuthGuard,
  type AuthenticatedRequest,
} from "./session-auth.guard.js";

type LoginBody = {
  readonly username?: unknown;
  readonly password?: unknown;
};

type CurrentUserResponse = {
  readonly username: string;
};

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  login(
    @Body() body: LoginBody,
    @Res({ passthrough: true }) response: Response,
  ): CurrentUserResponse {
    if (
      typeof body.username !== "string" ||
      typeof body.password !== "string" ||
      !this.authService.verifyCredentials(body.username, body.password)
    ) {
      throw new UnauthorizedException("Invalid credentials");
    }

    response.cookie(
      this.authService.sessionCookieName,
      this.authService.createSessionToken(),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: this.authService.isCookieSecure(),
        path: "/",
        maxAge: this.authService.sessionTtlMs,
      },
    );

    return { username: body.username };
  }

  @Post("logout")
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(this.authService.sessionCookieName, {
      httpOnly: true,
      sameSite: "lax",
      secure: this.authService.isCookieSecure(),
      path: "/",
    });
  }

  @Get("me")
  @UseGuards(SessionAuthGuard)
  getCurrentUser(@Req() request: Request): CurrentUserResponse {
    const authenticatedRequest = request as AuthenticatedRequest;

    return { username: authenticatedRequest.user?.username ?? "" };
  }
}

import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify phone with OTP' })
  verifyPhone(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyPhone(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Login with phone/email and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('login/otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP for phone login' })
  sendLoginOtp(@Body('phone') phone: string) {
    return this.authService.sendLoginOtp(phone);
  }

  @Post('login/otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with OTP' })
  loginWithOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.loginWithOtp(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body('refreshToken') token: string) {
    return this.authService.refreshToken(token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: any) {
    return this.authService.logout(req.user.id);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP' })
  forgotPassword(@Body('phone') phone: string) {
    return this.authService.forgotPassword(phone);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with OTP' })
  resetPassword(
    @Body('userId') userId: string,
    @Body('otp') otp: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(userId, otp, newPassword);
  }

  @Post('forgot-password-request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Submit manual forgot password request' })
  forgotPasswordRequest(
    @Body('phone') phone: string,
    @Body('name') name: string,
    @Body('emailOrUsername') emailOrUsername: string | undefined,
    @Req() req: any,
  ) {
    const ip = req.headers['x-forwarded-for'] || req.ip || '';
    return this.authService.submitForgotPasswordRequest(phone, name, emailOrUsername, ip);
  }

  @Get('reset-password/validate/:token')
  @ApiOperation({ summary: 'Validate reset token' })
  validateResetToken(@Param('token') token: string) {
    return this.authService.validateResetToken(token);
  }

  @Post('reset-password-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with admin-issued token' })
  resetPasswordWithToken(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPasswordWithToken(token, newPassword);
  }
}

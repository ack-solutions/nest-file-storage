/**
 * Example 7: User Avatar Upload
 *
 * A complete avatar feature: declarative validation, old-avatar cleanup, and a DB update.
 */

import { Controller, Post, UseInterceptors, Body, Request, BadRequestException, UseGuards } from '@nestjs/common';
import { FileStorageInterceptor, FileStorageService } from '@ackplus/nest-file-storage';
import { JwtAuthGuard } from './auth/jwt-auth.guard'; // your auth guard

interface User {
  id: number;
  email: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
}

class UserService {
  async findById(_id: number): Promise<User> {
    return {} as User; // your DB query
  }
  async updateAvatar(_id: number, _avatarKey: string | null, _avatarUrl: string | null): Promise<User> {
    return {} as User; // your DB update
  }
}

@Controller('users')
export class UserAvatarController {
  // v2: inject the service.
  constructor(
    private readonly userService: UserService,
    private readonly fileStorage: FileStorageService,
  ) {}

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileStorageInterceptor('avatar', {
      // Validation is declarative now — not thrown inside fileName.
      validation: {
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        maxSize: 5 * 1024 * 1024, // 5 MB
      },
      fileDist: () => 'avatars',
      fileName: (file, req) => `avatar-${req!.user.id}-${Date.now()}.${file.originalname.split('.').pop()}`,
      mapToRequestBody: (file) => file, // full UploadedFile
    })
  )
  async uploadAvatar(@Body() body: any, @Request() req: any) {
    const userId = req.user.id;
    const newAvatar = body.avatar;

    const user = await this.userService.findById(userId);

    // Delete the old avatar if present (don't fail the request if cleanup fails).
    if (user.avatarKey) {
      try {
        await this.fileStorage.deleteFile(user.avatarKey);
      } catch (err) {
        console.error('Failed to delete old avatar:', err);
      }
    }

    const updated = await this.userService.updateAvatar(userId, newAvatar.key, newAvatar.url);

    return {
      message: 'Avatar updated successfully',
      avatar: { key: newAvatar.key, url: newAvatar.url, size: newAvatar.size },
      user: { id: updated.id, email: updated.email, avatarUrl: updated.avatarUrl },
    };
  }

  @Post('avatar/delete')
  @UseGuards(JwtAuthGuard)
  async deleteAvatar(@Request() req: any) {
    const user = await this.userService.findById(req.user.id);
    if (!user.avatarKey) throw new BadRequestException('No avatar to delete');

    await this.fileStorage.deleteFile(user.avatarKey);
    await this.userService.updateAvatar(req.user.id, null, null);

    return { message: 'Avatar deleted successfully' };
  }
}

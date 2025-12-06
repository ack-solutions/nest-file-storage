/**
 * Example 7: User Avatar Upload
 * 
 * This example demonstrates a complete user avatar upload feature with
 * validation, old avatar cleanup, and database update.
 */

import { 
  Controller, 
  Post, 
  UseInterceptors, 
  Body, 
  Request,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileStorageInterceptor, FileStorageService } from '@ackplus/nest-file-storage';
import { JwtAuthGuard } from './auth/jwt-auth.guard'; // Your auth guard

// User entity interface
interface User {
  id: number;
  email: string;
  avatarKey?: string;
  avatarUrl?: string;
}

// User service (example)
class UserService {
  async findById(id: number): Promise<User> {
    // Your database query
    return {} as User;
  }

  async updateAvatar(id: number, avatarKey: string, avatarUrl: string): Promise<User> {
    // Your database update
    return {} as User;
  }
}

@Controller('users')
export class UserAvatarController {
  constructor(private readonly userService: UserService) {}

  @Post('avatar')
  @UseGuards(JwtAuthGuard) // Require authentication
  @UseInterceptors(
    FileStorageInterceptor('avatar', {
      fileName: (file, req) => {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
          throw new BadRequestException(
            'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'
          );
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          throw new BadRequestException('File size must be less than 5MB');
        }

        // Generate filename: avatar-{userId}-{timestamp}.{ext}
        const userId = req.user.id;
        const timestamp = Date.now();
        const ext = file.originalname.split('.').pop();
        return `avatar-${userId}-${timestamp}.${ext}`;
      },
      
      fileDist: () => 'avatars', // Store in avatars directory
      
      // Return full file object
      mapToRequestBody: (file) => file,
    })
  )
  async uploadAvatar(@Body() body: any, @Request() req) {
    const userId = req.user.id;
    const newAvatar = body.avatar;

    // Get current user
    const user = await this.userService.findById(userId);

    // Delete old avatar if exists
    if (user.avatarKey) {
      try {
        const storage = await FileStorageService.getStorage();
        await storage.deleteFile(user.avatarKey);
      } catch (error) {
        // Log error but don't fail the upload
        console.error('Failed to delete old avatar:', error);
      }
    }

    // Update user with new avatar
    const updatedUser = await this.userService.updateAvatar(
      userId,
      newAvatar.key,
      newAvatar.url
    );

    return {
      message: 'Avatar updated successfully',
      avatar: {
        key: newAvatar.key,
        url: newAvatar.url,
        size: newAvatar.size,
      },
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatarUrl,
      },
    };
  }

  @Post('avatar/delete')
  @UseGuards(JwtAuthGuard)
  async deleteAvatar(@Request() req) {
    const userId = req.user.id;
    const user = await this.userService.findById(userId);

    if (!user.avatarKey) {
      throw new BadRequestException('No avatar to delete');
    }

    // Delete from storage
    const storage = await FileStorageService.getStorage();
    await storage.deleteFile(user.avatarKey);

    // Update database
    await this.userService.updateAvatar(userId, null, null);

    return {
      message: 'Avatar deleted successfully',
    };
  }
}


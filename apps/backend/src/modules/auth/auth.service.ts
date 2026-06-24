import { User } from '../../models';
import { RegisterInput, LoginInput } from './auth.validation';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateToken } from '../../utils/jwt';
import { ConflictError, UnauthorizedError } from '../../utils/errors';

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const hashedPassword = await hashPassword(input.password);
    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      password: hashedPassword,
      phone: input.phone,
      role: input.role,
      hotelId: input.hotelId,
    });

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      hotelId: user.hotelId?.toString(),
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hotelId: user.hotelId,
      },
      token,
    };
  }

  async login(input: LoginInput) {
    const user = await User.findOne({ email: input.email.toLowerCase() }).select('+password');
    if (!user || user.isDeleted || !user.isActive) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await comparePassword(input.password, user.password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      hotelId: user.hotelId?.toString(),
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hotelId: user.hotelId,
      },
      token,
    };
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      hotelId: user.hotelId,
      lastLoginAt: user.lastLoginAt,
    };
  }
}

export const authService = new AuthService();

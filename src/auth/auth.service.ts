import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { compare, hash } from 'bcrypt';
import { HttpException } from '@nestjs/common/exceptions';
import { JwtService } from '@nestjs/jwt/dist';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(body: RegisterAuthDto) {
    const { name, email, password } = body;
    const hashedPassword = await hash(password, 10);

    const data = { password: hashedPassword, name, email };

    return this.prisma.user.create({ data });
  }

  async login(body: LoginAuthDto) {
    const { email, password } = body;

    const user = await this.prisma.user.findFirst({ where: { email } });

    if (!user) return new HttpException('User not found', 404);

    const passwordCorrect = await compare(password, user.password);

    if (!passwordCorrect) return new HttpException('Bad credentials', 403);

    delete user.password;

    const token = this.jwt.sign({ id: user.id, email: user.email });

    return { ...user, token };
  }

  async google(body: { token: string }) {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const { token } = body;

    try {
      const userData = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const { name, email, picture, sub, email_verified } =
        userData.getPayload();

      const user = await this.prisma.user.findFirst({ where: { email } });

      let newUser: any;

      if (!user) {
        const data = {
          name,
          email,
          image: picture,
          emailVerified: email_verified ? new Date().toISOString() : null,
          googleId: sub,
        };

        newUser = await this.prisma.user.create({ data });
      } else {
        const data = {
          ...user,
          name,
          image: picture,
          emailVerified: email_verified ? new Date().toISOString() : null,
          googleId: sub,
        };

        newUser = await this.prisma.user.update({
          where: {
            email,
          },
          data: {
            ...data,
          },
        });

        delete newUser.password;
      }

      const jwtToken = this.jwt.sign({ id: newUser.id, email: newUser.email });

      return { ...newUser, token: jwtToken };
    } catch (error) {
      return new HttpException(error, 500);
    }
  }
}

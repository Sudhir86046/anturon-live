import { Request, Response } from "express";
import { authService } from "./auth.service";
import { AuthRequest } from "./auth.middleware";

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const result = await authService.register(req.body);

      return res.status(201).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      return res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        error: error.message,
      });
    }
  }

  async me(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const result = await authService.me(req.user.userId);

      return res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const token = String(req.query.token || "");

      if (!token) {
        return res.status(400).json({
          success: false,
          error: "Verification token is required",
        });
      }

      const result = await authService.verifyEmail(token);

      return res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export const authController = new AuthController();
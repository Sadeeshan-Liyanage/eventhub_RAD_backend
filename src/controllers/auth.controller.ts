import { Request, Response } from "express";
import { User, UserDocument } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/response";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "../utils/tokens";

const publicUser = (u: UserDocument) => ({
  id: u._id.toString(),
  name: u.name,
  email: u.email,
  role: u.role,
});

const issueTokens = async (user: UserDocument) => {
  const accessToken = signAccessToken({ id: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken(user._id.toString());
  await User.updateOne({ _id: user._id }, { refreshTokenHash: hashToken(refreshToken) });
  return { accessToken, refreshToken };
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  if (await User.findOne({ email })) throw new AppError(409, "Email is already registered");

  const user = await User.create({ name, email, password, role });
  const tokens = await issueTokens(user);
  sendSuccess(res, { user: publicUser(user), ...tokens }, 201, "Account created");
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError(401, "Invalid email or password");
  }
  const tokens = await issueTokens(user);
  sendSuccess(res, { user: publicUser(user), ...tokens }, 200, "Logged in");
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  let payload: { id: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, "Invalid or expired refresh token");
  }
  const user = await User.findById(payload.id).select("+refreshTokenHash");
  if (!user || user.refreshTokenHash !== hashToken(refreshToken)) {
    throw new AppError(401, "Refresh token has been revoked");
  }
  // rotation: every refresh issues a brand new pair
  const tokens = await issueTokens(user);
  sendSuccess(res, { user: publicUser(user), ...tokens });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await User.updateOne({ _id: req.user!.id }, { $unset: { refreshTokenHash: 1 } });
  sendSuccess(res, null, 200, "Logged out");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw new AppError(404, "User not found");
  sendSuccess(res, { user: publicUser(user) });
});

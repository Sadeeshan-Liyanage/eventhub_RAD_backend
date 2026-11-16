import { Schema, model, Model, HydratedDocument } from "mongoose";
import bcrypt from "bcryptjs";

export type Role = "user" | "organizer";

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: Role;
  refreshTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<IUser, {}, IUserMethods>;
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["user", "organizer"], default: "user" },
    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUser, UserModel>("User", userSchema);


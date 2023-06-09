import { Schema } from "mongoose";
import { normalize } from "utils/string";
import { IUser } from "./IUser";

export const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      select: false,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      select: false
    },
    password: {
      type: String,
      select: false
    },
    securityCode: {
      type: String,
      select: false
    },
    userImage: {
      type: {
        base64: String,
        width: Number,
        height: Number
      }
    },
    userName: {
      type: String,
      unique: true,
      trim: true
    },
    userSubscription: {
      type: Schema.Types.Mixed,
      select: false
    },
    isAdmin: Boolean,
    isOnline: Boolean,
    suggestedCategoryAt: String,
    userDescription: String,
    userProjects: {
      type: [{ type: Schema.Types.ObjectId, ref: "Project" }],
      default: []
    }
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

UserSchema.index({ email: 1, userName: 1 }, { unique: true });

// UserSchema.pre("init", function (next) {
//   if (!this.userName) this.userName = normalize(this.email.replace(/@.+/, ""));
//   return next();
// });

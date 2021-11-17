import { Schema } from "mongoose";
import { IOrg, OrgType } from "./IOrg";

export const OrgTypes: { [key: string]: OrgType } = {
  ASSO: "ASSO",
  GROUP: "GROUP",
  NETWORK: "NETWORK"
};
export const OrgTypesV: { [key: string]: string } = {
  ASSO: "Association",
  GROUP: "Groupe",
  NETWORK: "Réseau"
};

export const Visibility: { [key: string]: string } = {
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE"
};
export const VisibilityV: { [key: string]: string } = {
  PUBLIC: "Publique",
  PRIVATE: "Privée"
};

export const OrgSchema = new Schema<IOrg>(
  {
    orgName: {
      type: String,
      required: true,
      trim: true
    },
    orgUrl: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    orgType: {
      type: String,
      enum: Object.keys(OrgTypes).map((key) => OrgTypes[key]),
      required: true
    },
    orgAddress: [{ address: { type: String, trim: true } }],
    orgCity: String,
    orgLat: Number,
    orgLng: Number,
    orgEmail: [{ email: { type: String, trim: true } }],
    orgPhone: [{ phone: { type: String, trim: true } }],
    orgWeb: [
      {
        url: { type: String, trim: true },
        prefix: { type: String, trim: true }
      }
    ],
    orgDescription: {
      type: String,
      trim: true
    },
    orgDescriptionHtml: {
      type: String,
      trim: true
    },
    orgEvents: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    orgLists: [
      {
        listName: { type: String, required: true, trim: true },
        subscriptions: [
          {
            type: Schema.Types.ObjectId,
            ref: "Subscription"
          }
        ]
      }
    ],
    orgProjects: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    orgSubscriptions: [
      { type: Schema.Types.ObjectId, ref: "Subscription", required: true }
    ],
    orgTopics: [{ type: Schema.Types.ObjectId, ref: "Topic" }],
    orgTopicsCategories: [String],
    orgLogo: {
      base64: String,
      width: Number,
      height: Number,
      url: { type: String, trim: true }
    },
    orgBanner: {
      base64: String,
      height: Number,
      headerHeight: Number,
      width: Number,
      mode: String,
      url: { type: String, trim: true }
    },
    orgVisibility: {
      type: String,
      enum: Object.keys(Visibility).map((key) => Visibility[key])
    },
    orgs: [{ type: Schema.Types.ObjectId, ref: "Org" }],
    isApproved: Boolean,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);
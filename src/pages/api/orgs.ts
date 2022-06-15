import { Document } from "mongoose";
import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import database, { models } from "database";
import {
  createServerError,
  databaseErrorCodes,
  duplicateError
} from "utils/errors";
import { getSession } from "utils/auth";
import { logJson, normalize } from "utils/string";
import { IOrg, EOrgVisibility } from "models/Org";
import { randomNumber } from "utils/randomNumber";
import { AddOrgPayload } from "features/api/orgsApi";

const handler = nextConnect<NextApiRequest, NextApiResponse>();

handler.use(database);

handler.get<
  NextApiRequest & {
    query: { populate?: string; createdBy?: string };
  },
  NextApiResponse
>(async function getOrgs(req, res) {
  const session = await getSession({ req });

  try {
    const {
      query: { populate, createdBy }
    } = req;

    let selector:
      | {
          orgVisibility: EOrgVisibility;
        }
      | { createdBy: string } = { orgVisibility: EOrgVisibility.PUBLIC };

    if (
      createdBy &&
      (session?.user.isAdmin || session?.user.userId === createdBy)
    ) {
      selector = { createdBy };
    }

    let orgs = await models.Org.find(selector);

    if (populate)
      orgs = await Promise.all(
        orgs.map((org) => org.populate(populate).execPopulate())
      );

    res.status(200).json(orgs);
  } catch (error) {
    res.status(500).json(createServerError(error));
  }
});

handler.post<NextApiRequest & { body: AddOrgPayload }, NextApiResponse>(
  async function addOrg(req, res) {
    const session = await getSession({ req });

    if (!session) {
      return res
        .status(401)
        .json(createServerError(new Error("Vous devez être identifié")));
    }

    try {
      const { body }: { body: AddOrgPayload } = req;
      const orgName = body.orgName.trim();
      const orgUrl = normalize(orgName);
      let newOrg = {
        ...body,
        createdBy: session.user.userId,
        orgName,
        orgUrl,
        isApproved: session.user.isAdmin
      };

      const org = await models.Org.findOne({ orgUrl });
      const user = await models.User.findOne({ userName: orgUrl });
      const event = await models.Event.findOne({ eventUrl: orgUrl });

      if (org || user || event) {
        const uid = randomNumber(2);
        newOrg = {
          ...newOrg,
          orgName: orgName + "-" + uid,
          orgUrl: orgUrl + "-" + uid
        };
      }

      logJson(`POST /orgs: create`, newOrg);
      const doc = await models.Org.create(newOrg);

      res.status(200).json(doc);
    } catch (error: any) {
      res.status(500).json(createServerError(error));
    }
  }
);

export default handler;

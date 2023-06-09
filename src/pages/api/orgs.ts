import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import database, { models, unauthorizedEntityUrls } from "database";
import { AddOrgPayload, GetOrgsParams } from "features/api/orgsApi";
import { EOrgVisibility } from "models/Org";
import { getCurrentId } from "store/utils";
import { getSession } from "utils/auth";
import { createServerError } from "utils/errors";
import { logJson, normalize } from "utils/string";

const handler = nextConnect<NextApiRequest, NextApiResponse>();

handler.use(database);

handler.get<
  NextApiRequest & {
    query: GetOrgsParams;
  },
  NextApiResponse
>(async function getOrgs(req, res) {
  const session = await getSession({ req });

  try {
    const {
      query: { orgType, populate, createdBy }
    } = req;

    let selector: GetOrgsParams & {
      orgVisibility?: EOrgVisibility;
    } = {
      orgVisibility: EOrgVisibility.PUBLIC
    };

    if (typeof createdBy === "string") {
      if (session?.user.isAdmin || session?.user.userId === createdBy)
        selector = { createdBy };
      else selector.createdBy = createdBy;
    }

    if (orgType) selector.orgType = orgType;

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

      if (unauthorizedEntityUrls.includes(orgUrl)) {
        return res
          .status(400)
          .json(
            createServerError(
              new Error(`Ce nom d'organisation n'est pas autorisé`)
            )
          );
      }

      let newOrg = {
        ...body,
        createdBy: session.user.userId,
        orgName,
        orgUrl,
        isApproved: session.user.isAdmin
      };

      const event = await models.Event.findOne({ eventUrl: orgUrl });
      const org = await models.Org.findOne({ orgUrl });
      const user = await models.User.findOne({ userName: orgUrl });
      if (event || org || user) {
        const uid = (await getCurrentId()) + 1;
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

import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import database, { models } from "database";
import { createServerError } from "utils/errors";

const handler = nextConnect<NextApiRequest, NextApiResponse>();

handler.use(database);

handler.get<NextApiRequest & { query: { userId: string } }, NextApiResponse>(
  async function getOrgs(req, res) {
    try {
      const userId = decodeURIComponent(req.query.userId);
      const orgs = await models.Org.find(
        { createdBy: userId },
        { orgBanner: 0 }
      );

      res.status(200).json(orgs);
    } catch (error) {
      res.status(500).json(createServerError(error));
    }
  }
);

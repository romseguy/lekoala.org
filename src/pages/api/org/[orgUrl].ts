import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import nodemailer from "nodemailer";
import nodemailerSendgrid from "nodemailer-sendgrid";
import database, { models } from "database";
import { getSession } from "hooks/useAuth";
import type { IOrg } from "models/Org";
import type { ITopic } from "models/Topic";
import {
  createServerError,
  databaseErrorCodes,
  duplicateError
} from "utils/errors";
import { equals, log, normalize } from "utils/string";

const transport = nodemailer.createTransport(
  nodemailerSendgrid({
    apiKey: process.env.EMAIL_API_KEY
  })
);

const handler = nextConnect<NextApiRequest, NextApiResponse>();

handler.use(database);

handler.get<
  NextApiRequest & { query: { orgUrl: string; populate?: string } },
  NextApiResponse
>(async function getOrg(req, res) {
  try {
    const session = await getSession({ req });
    const {
      query: { orgUrl, populate }
    } = req;

    let org = await models.Org.findOne({ orgUrl });

    if (!org)
      return res
        .status(404)
        .json(
          createServerError(
            new Error(`L'organisation ${orgUrl} n'a pas pu être trouvé`)
          )
        );

    // hand emails to org creator only
    const isCreator =
      equals(org.createdBy, session?.user.userId) || session?.user.isAdmin;

    let select = isCreator
      ? "-password -securityCode"
      : "-email -password -securityCode";

    if (populate) {
      if (populate.includes("orgs")) org = org.populate("orgs");

      if (populate.includes("orgEvents")) org = org.populate("orgEvents");

      if (populate.includes("orgLists"))
        org = org.populate({
          path: "orgLists",
          populate: {
            path: "subscriptions",
            populate: { path: "user", select }
          }
        });

      if (populate.includes("orgProjects"))
        org = org.populate({
          path: "orgProjects",
          populate: [{ path: "projectOrgs createdBy" }]
        });

      if (populate.includes("orgTopics"))
        org = org.populate({
          path: "orgTopics",
          populate: [
            {
              path: "topicMessages",
              populate: { path: "createdBy" }
            },
            { path: "createdBy" }
          ]
        });

      if (populate.includes("orgSubscriptions"))
        org = org.populate({
          path: "orgSubscriptions",
          select: isCreator ? undefined : "-email",
          populate: {
            path: "user",
            select
          }
        });
    }

    org = await org
      .populate("createdBy", select + " -userImage")
      .execPopulate();

    if (!populate || !populate.includes("orgLogo")) {
      org.orgLogo = undefined;
    }
    if (!populate || !populate.includes("orgBanner")) {
      org.orgBanner = undefined;
    }

    for (const orgEvent of org.orgEvents) {
      if (orgEvent.forwardedFrom?.eventId) {
        const e = await models.Event.findOne({
          _id: orgEvent.forwardedFrom.eventId
        });
        if (e) {
          orgEvent.forwardedFrom.eventUrl = orgEvent._id;
          orgEvent.eventName = e.eventName;
          orgEvent.eventUrl = e.eventUrl;
        }
      }
    }

    for (const orgTopic of org.orgTopics) {
      if (orgTopic.topicMessages) {
        for (const topicMessage of orgTopic.topicMessages) {
          if (typeof topicMessage.createdBy === "object") {
            if (
              !topicMessage.createdBy.userName &&
              topicMessage.createdBy.email
            ) {
              topicMessage.createdBy.userName =
                topicMessage.createdBy.email.replace(/@.+/, "");
            }
            // todo: check this
            // topicMessage.createdBy.email = undefined;
          }
        }
      }
    }

    res.status(200).json(org);
  } catch (error) {
    res.status(500).json(createServerError(error));
  }
});

handler.put<
  NextApiRequest & {
    query: { orgUrl: string };
    body: Partial<IOrg> | string[];
  },
  NextApiResponse
>(async function editOrg(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res
      .status(403)
      .json(
        createServerError(
          new Error("Vous devez être identifié pour accéder à ce contenu")
        )
      );
  }

  try {
    let { body }: { body: Partial<IOrg> | string[] } = req;
    const orgUrl = req.query.orgUrl;

    console.log(`PUT /org/${orgUrl}: body`, body);

    const org = await models.Org.findOne({ orgUrl });

    if (!org)
      return res
        .status(404)
        .json(
          createServerError(
            new Error(`L'organisation ${orgUrl} n'a pas pu être trouvé`)
          )
        );

    if (!equals(org.createdBy, session.user.userId) && !session.user.isAdmin)
      return res
        .status(403)
        .json(
          createServerError(
            new Error(
              "Vous ne pouvez pas modifier un organisation que vous n'avez pas créé."
            )
          )
        );

    let update:
      | {
          $unset?: { [key: string]: number };
          $pull?: { [key: string]: { [key: string]: string } | string };
        }
      | undefined;

    if (Array.isArray(body)) {
      for (const key of body) {
        if (key.includes(".") && key.includes("=")) {
          // orgLists.listName=string
          const matches = key.match(/([^\.]+)\.([^=]+)=(.+)/);

          if (matches && matches.length === 4) {
            update = {
              $pull: { [matches[1]]: { [matches[2]]: matches[3] } }
            };
          }
        } else if (key.includes("=")) {
          // orgTopicsCategories=string
          const matches = key.match(/([^=]+)=(.+)/);

          if (matches && matches.length === 3) {
            update = {
              $pull: { [matches[1]]: matches[2] }
            };

            if (matches[1] === "orgTopicsCategories") {
              await models.Topic.updateMany(
                { topicCategory: matches[2] },
                { topicCategory: null }
              );
            }
          }
        } else update = { $unset: { [key]: 1 } };
      }
    } else {
      if (body.orgName) {
        body = {
          ...body,
          orgName: body.orgName.trim(),
          orgUrl: normalize(body.orgName.trim())
        };

        if (
          body.orgName !== org.orgName &&
          (await models.Org.findOne({ orgName: body.orgName }))
        )
          throw duplicateError();
      }

      // if (
      //   Array.isArray(body.orgLists) &&
      //   body.orgLists.length > 0 &&
      //   org.orgLists
      // ) {
      //   for (const orgList of body.orgLists)
      //     for (const { listName } of org.orgLists)
      //       if (orgList.listName === listName)
      //         throw duplicateError({ field: "listName" });
      // }
    }

    log(`PUT /org/${orgUrl}:`, update || body);
    const { n, nModified } = await models.Org.updateOne(
      { orgUrl },
      update || body
    );

    if (nModified === 1) {
      res.status(200).json({});
    } else {
      res
        .status(400)
        .json(
          createServerError(
            new Error(`L'organisation ${orgUrl} n'a pas pu être modifiée`)
          )
        );
    }
  } catch (error: any) {
    if (error.code && error.code === databaseErrorCodes.DUPLICATE_KEY)
      res.status(400).json({
        [error.field || "orgName"]: "Ce nom n'est pas disponible"
      });
    else res.status(500).json(createServerError(error));
  }
});

handler.delete<
  NextApiRequest & {
    query: { orgUrl: string };
  },
  NextApiResponse
>(async function removeOrg(req, res) {
  const session = await getSession({ req });

  if (!session) {
    res
      .status(403)
      .json(
        createServerError(
          new Error("Vous devez être identifié pour accéder à ce contenu")
        )
      );
  } else {
    try {
      const orgUrl = req.query.orgUrl;
      const org = await models.Org.findOne({ orgUrl });

      if (!org) {
        return res
          .status(404)
          .json(
            createServerError(
              new Error(`L'organisation ${orgUrl} n'a pas pu être trouvé`)
            )
          );
      }

      if (
        !equals(org.createdBy, session.user.userId) &&
        !session.user.isAdmin
      ) {
        return res
          .status(403)
          .json(
            createServerError(
              new Error(
                "Vous ne pouvez pas supprimer une organisation que vous n'avez pas créé."
              )
            )
          );
      }

      const { deletedCount } = await models.Org.deleteOne({ orgUrl });

      // todo delete references to this org

      if (deletedCount === 1) {
        res.status(200).json(org);
      } else {
        res
          .status(400)
          .json(
            createServerError(
              new Error(`L'organisation ${orgUrl} n'a pas pu être supprimé`)
            )
          );
      }
    } catch (error) {
      res.status(500).json(createServerError(error));
    }
  }
});

export default handler;

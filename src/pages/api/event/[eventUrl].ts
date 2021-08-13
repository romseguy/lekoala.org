import type { Document } from "mongoose";
import type { IEvent } from "models/Event";
import type { ITopic } from "models/Topic";
import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import database, { models } from "database";
import { createServerError } from "utils/errors";
import nodemailer from "nodemailer";
import nodemailerSendgrid from "nodemailer-sendgrid";
import { getSession } from "hooks/useAuth";
import { sendEventToOrgFollowers } from "utils/email";
import { equals, normalize } from "utils/string";
import { addOrUpdateTopic } from "api";

const transport = nodemailer.createTransport(
  nodemailerSendgrid({
    apiKey: process.env.EMAIL_API_KEY
  })
);

const handler = nextConnect<NextApiRequest, NextApiResponse>();

handler.use(database);

handler.get<NextApiRequest & { query: { eventUrl: string } }, NextApiResponse>(
  async function getEvent(req, res) {
    try {
      const session = await getSession({ req });
      const {
        query: { eventUrl }
      } = req;

      let event = await models.Event.findOne({
        eventUrl
      });

      if (!event) {
        return res
          .status(404)
          .json(
            createServerError(
              new Error(`L'événement ${eventUrl} n'a pas pu être trouvé`)
            )
          );
      }

      // hand emails to event creator only
      let select =
        session && equals(event.createdBy, session.user.userId)
          ? "-password -securityCode"
          : "-email -password -securityCode";

      event = await event
        .populate("createdBy", select + " -userImage")
        .populate("eventOrgs eventTopics")
        .populate({
          path: "eventTopics",
          populate: [
            {
              path: "topicMessages",
              populate: {
                path: "createdBy",
                select
              }
            },
            { path: "createdBy", select: select + " -userImage" }
          ]
        })
        .execPopulate();

      if (event) {
        res.status(200).json(event);
      }
    } catch (error) {
      res.status(500).json(createServerError(error));
    }
  }
);

handler.post<
  NextApiRequest & {
    query: { eventUrl: string };
    body: { topic?: ITopic };
  },
  NextApiResponse
>(async function postEventDetails(req, res) {
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
      const {
        query: { eventUrl },
        body
      }: {
        query: { eventUrl: string };
        body: { topic?: ITopic; event?: IEvent };
      } = req;

      const event = await models.Event.findOne({ eventUrl });

      if (!event) {
        return res
          .status(404)
          .json(
            createServerError(
              new Error(`L'événement ${eventUrl} n'a pas pu être trouvé`)
            )
          );
      }

      addOrUpdateTopic({ body, event, transport, res });
      res.status(200).json(event);
    } catch (error) {
      res.status(400).json(createServerError(error));
    }
  }
});

handler.put<
  NextApiRequest & {
    query: { eventUrl: string };
    body: IEvent;
  },
  NextApiResponse
>(async function editEvent(req, res) {
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
      const { body }: { body: IEvent } = req;
      const eventUrl = req.query.eventUrl;
      body.eventUrl = normalize(body.eventName);

      const event = await models.Event.findOne({ eventUrl });

      if (!event) {
        return res
          .status(404)
          .json(
            createServerError(
              new Error(`L'événement ${eventUrl} n'a pas pu être trouvé`)
            )
          );
      }

      if (!equals(event.createdBy, session.user.userId)) {
        return res
          .status(403)
          .json(
            createServerError(
              new Error(
                "Vous ne pouvez pas modifier un événement que vous n'avez pas créé."
              )
            )
          );
      }

      const staleEventOrgsIds: string[] = [];

      for (const { _id } of body.eventOrgs) {
        const org = await models.Org.findOne({ _id });

        if (!org) {
          staleEventOrgsIds.push(_id);
          continue;
        }

        if (org.orgEvents.indexOf(event._id) === -1) {
          await models.Org.updateOne(
            { _id: org._id },
            {
              $push: {
                orgEvents: event._id
              }
            }
          );
        }
      }

      if (staleEventOrgsIds.length > 0) {
        body.eventOrgs = body.eventOrgs.filter(
          (eventOrg) => !staleEventOrgsIds.find((id) => id === eventOrg._id)
        );
      }

      const emailList = await sendEventToOrgFollowers(body, transport);

      const { n, nModified } = await models.Event.updateOne({ eventUrl }, body);

      if (nModified === 1) {
        res.status(200).json({ emailList });
      } else {
        res
          .status(400)
          .json(
            createServerError(new Error("L'événement n'a pas pu être modifié"))
          );
      }
    } catch (error) {
      res.status(500).json(createServerError(error));
    }
  }
});

handler.delete<
  NextApiRequest & {
    query: { eventUrl: string };
  },
  NextApiResponse
>(async function removeEvent(req, res) {
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
      const eventUrl = req.query.eventUrl;
      const event = await models.Event.findOne({ eventUrl });

      if (!event) {
        return res
          .status(404)
          .json(
            createServerError(
              new Error(`L'événement ${eventUrl} n'a pas pu être trouvé`)
            )
          );
      }

      if (!equals(event.createdBy, session.user.userId)) {
        return res
          .status(403)
          .json(
            createServerError(
              new Error(
                "Vous ne pouvez pas supprimer un événement que vous n'avez pas créé."
              )
            )
          );
      }

      const { deletedCount } = await models.Event.deleteOne({ eventUrl });

      if (deletedCount === 1) {
        res.status(200).json(event);
      } else {
        res
          .status(400)
          .json(
            createServerError(
              new Error(`L'événement ${eventUrl} n'a pas pu être supprimé`)
            )
          );
      }
    } catch (error) {
      res.status(500).json(createServerError(error));
    }
  }
});

export default handler;

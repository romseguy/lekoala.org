import type { IEvent } from "models/Event";
import type { ITopic } from "models/Topic";
import nodemailer from "nodemailer";
import nodemailerSendgrid from "nodemailer-sendgrid";
import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import database, { models } from "database";
import { createServerError } from "utils/errors";
import { getSession } from "hooks/useAuth";
import { sendToFollowers } from "utils/email";
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
    const eventUrl = req.query.eventUrl;

    try {
      const event = await models.Event.findOne({
        eventUrl
      })
        .populate("createdBy", "-email -password -securityCode -userImage")
        .populate("eventOrgs eventTopics")
        .populate({
          path: "eventTopics",
          populate: [
            {
              path: "topicMessages",
              populate: {
                path: "createdBy",
                select: "-email -password -securityCode"
              }
            },
            { path: "createdBy", select: "-email -password -securityCode" }
          ]
        });

      if (event) {
        res.status(200).json(event);
      } else {
        res
          .status(404)
          .json(
            createServerError(
              new Error(`L'événement ${eventUrl} n'a pas pu être trouvé`)
            )
          );
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
          new Error("Vous devez être identifié pour accéder à ce contenu.")
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

      const { body }: { body: { topic?: ITopic } } = req;
      addOrUpdateTopic(body, event, transport, res);
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
          new Error("Vous devez être identifié pour accéder à ce contenu.")
        )
      );
  } else {
    try {
      const { body }: { body: IEvent } = req;
      const eventUrl = req.query.eventUrl;
      body.eventNameLower = body.eventName.toLowerCase();
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

      const emailList = await sendToFollowers(body, transport);

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
          new Error("Vous devez être identifié pour accéder à ce contenu.")
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

import { Document, Types } from "mongoose";
import nodemailer from "nodemailer";
import nodemailerSendgrid from "nodemailer-sendgrid";
import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import database, { models } from "database";
import {
  createServerError,
  databaseErrorCodes,
  duplicateError
} from "utils/errors";
import { getSession } from "hooks/useAuth";
import { sendToAdmin } from "utils/email";
import { equals, normalize } from "utils/string";
import { IEvent, Visibility } from "models/Event";
import { IOrg } from "models/Org";
import api from "utils/api";

const transport = nodemailer.createTransport(
  nodemailerSendgrid({
    apiKey: process.env.EMAIL_API_KEY
  })
);

const handler = nextConnect<NextApiRequest, NextApiResponse>();

handler.use(database);

handler.get<NextApiRequest & { query: { userId?: string } }, NextApiResponse>(
  async function getEvents(req, res) {
    const {
      query: { userId }
    } = req;
    let events;
    let selector = {};

    if (userId) selector = { createdBy: userId };

    try {
      events = await models.Event.find(selector, "-eventBanner -eventLogo")
        .sort({
          eventMinDate: "ascending"
        })
        .populate("eventOrgs", "-orgBanner -orgLogo")
        .populate("createdBy", "userName");

      for (const event of events) {
        if (event.forwardedFrom?.eventId) {
          const e = await models.Event.findOne({
            _id: event.forwardedFrom?.eventId
          });
          if (e) {
            event.eventName = e.eventName;
            event.eventUrl = e.eventUrl;
          }
        }
      }

      res.status(200).json(events);
    } catch (error) {
      res.status(500).json(createServerError(error));
    }
  }
);

handler.post<NextApiRequest, NextApiResponse>(async function postEvent(
  req,
  res
) {
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
      let { body }: { body: IEvent } = req;
      body = { ...body, eventName: body.eventName.trim() };
      const eventUrl = normalize(body.eventName);

      let event: (IEvent & Document<any, any, any>) | null = null;
      let eventOrgs: IOrg[] = [];

      if (body.forwardedFrom) {
        event = await models.Event.findOne({ eventUrl });

        for (const eventOrg of body.eventOrgs) {
          const o = await models.Org.findOne({ _id: eventOrg._id }).populate(
            "orgEvents"
          );

          if (
            o &&
            !o.orgEvents.find((orgEvent) => equals(orgEvent.eventUrl, eventUrl))
          ) {
            eventOrgs.push(o);
          }
        }

        if (eventOrgs.length > 0) {
          if (event) {
            console.log(
              "event has already been forwarded => adding new eventOrgs"
            );
            event.eventOrgs = event.eventOrgs.concat(eventOrgs);
            await event.save();
          } else {
            event = await models.Event.create({ ...body, eventUrl, eventOrgs });
          }
        }
      } else {
        event = await models.Event.findOne({ eventUrl });
        if (event) throw duplicateError();
        const org = await models.Org.findOne({ orgUrl: eventUrl });
        if (org) throw duplicateError();
        const user = await models.User.findOne({ userName: body.eventName });
        if (user) throw duplicateError();

        let isApproved = session.user.isAdmin;

        for (const eventOrg of body.eventOrgs) {
          const o = await models.Org.findOne({ _id: eventOrg._id });

          if (!o) {
            console.log("POST /events: skipping unknown eventOrg");
            continue;
          } else {
            eventOrgs.push(o);

            if (o.isApproved) {
              isApproved = true;
            }
          }
        }

        console.log("POST /events: creating event with eventOrgs", eventOrgs);

        event = await models.Event.create({
          ...body,
          eventUrl,
          eventOrgs,
          isApproved
        });

        if (!isApproved) {
          const admin = await models.User.findOne({ isAdmin: true });

          if (
            admin &&
            admin.userSubscription &&
            event.eventVisibility === Visibility.PUBLIC
          ) {
            await api.sendPushNotification({
              subscription: admin.userSubscription,
              message: "Appuyez pour ouvrir la page de l'événement",
              title: "Un événement attend votre approbation",
              url: `${process.env.NEXT_PUBLIC_URL}/${event.eventUrl}`
            });
            sendToAdmin({ event: body, transport });
          }
        }
      }

      if (event) {
        await models.Org.updateMany(
          {
            _id: {
              $in: eventOrgs.map((eventOrg) =>
                typeof eventOrg === "object" ? eventOrg._id : eventOrg
              )
            }
          },
          {
            $push: {
              orgEvents: event._id
            }
          }
        );
      }

      res.status(200).json(event);
    } catch (error: any) {
      if (error.code && error.code === databaseErrorCodes.DUPLICATE_KEY) {
        res.status(400).json({
          eventName: "Ce nom d'événement n'est pas disponible"
        });
      } else {
        res.status(500).json(createServerError(error));
      }
    }
  }
});

export default handler;

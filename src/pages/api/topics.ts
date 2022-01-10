import { Document, Types } from "mongoose";
import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import nodemailer from "nodemailer";
import nodemailerSendgrid from "nodemailer-sendgrid";
import {
  sendTopicMessageEmailNotifications,
  sendTopicNotifications
} from "api/email";
import { AddTopicParams } from "api/forum";
import database, { models } from "database";
import { getSession } from "hooks/useAuth";
import { IEvent } from "models/Event";
import { getSubscriptions, IOrg } from "models/Org";
import {
  getSubscriberSubscription,
  ISubscription,
  SubscriptionTypes
} from "models/Subscription";
import { ITopic } from "models/Topic";
import { createServerError } from "utils/errors";
import { equals, logJson, toString } from "utils/string";

const transport = nodemailer.createTransport(
  nodemailerSendgrid({
    apiKey: process.env.EMAIL_API_KEY
  })
);

const handler = nextConnect<NextApiRequest, NextApiResponse>();

handler.use(database);

handler.get<
  NextApiRequest & {
    query: { createdBy?: string };
  },
  NextApiResponse
>(async function getTopics(req, res) {
  try {
    const {
      query: { populate, createdBy }
    } = req;

    let topics: (ITopic & Document<any, any, ITopic>)[] = [];
    const selector = createdBy ? { createdBy } : {};

    logJson(`GET /topics: selector`, selector);

    if (populate) topics = await models.Topic.find(selector).populate(populate);
    else topics = await models.Topic.find(selector);

    res.status(200).json(topics);
  } catch (error) {
    res.status(500).json(createServerError(error));
  }
});

handler.post<NextApiRequest & { body: AddTopicParams }, NextApiResponse>(
  async function postTopic(req, res) {
    const session = await getSession({ req });

    if (!session)
      return res
        .status(403)
        .json(
          createServerError(
            new Error("Vous devez être identifié pour accéder à ce contenu")
          )
        );

    try {
      const {
        body
      }: {
        body: AddTopicParams;
      } = req;

      let event: (IEvent & Document<any, any, IEvent>) | null | undefined;
      let org: (IOrg & Document<any, any, IOrg>) | null | undefined;

      if (body.event)
        event = await models.Event.findOne({ _id: body.event._id });
      else if (body.org) org = await models.Org.findOne({ _id: body.org._id });

      if (!event && !org)
        return res
          .status(400)
          .json(
            createServerError(
              new Error(
                "Le sujet de discussion doit être associé à une organisation ou à un événément"
              )
            )
          );

      let emailList: string[] = [];
      let topic: (ITopic & Document<any, any, ITopic>) | null | undefined;
      const topicNotif = body.topicNotif || false;

      //#region existing topic
      if (body.topic._id) {
        if (
          !Array.isArray(body.topic.topicMessages) ||
          !body.topic.topicMessages.length
        )
          return res
            .status(400)
            .json(
              createServerError(
                new Error(
                  "Vous devez indiquer la réponse à ajouter à cette discussion"
                )
              )
            );

        topic = await models.Topic.findOne({ _id: body.topic._id });

        if (!topic)
          return res
            .status(404)
            .json(
              createServerError(
                new Error(
                  "Impossible d'ajouter une réponse à une discussion inexistante"
                )
              )
            );

        logJson(`POST /topics: adding message to topic`, topic);

        const newMessage = {
          ...body.topic.topicMessages[0],
          createdBy: session.user.userId
        };
        topic.topicMessages.push(newMessage);
        await topic.save();

        if (topicNotif) {
          const subscriptions = await models.Subscription.find({
            "topics.topic": Types.ObjectId(body.topic._id),
            user: { $ne: newMessage.createdBy }
          }).populate("user");

          logJson(`POST /topics: topic subscriptions`, subscriptions);

          sendTopicMessageEmailNotifications({
            event,
            org,
            subscriptions,
            topic,
            transport
          });
        }
      }
      //#endregion
      //#region new topic
      else {
        topic = await models.Topic.create({
          ...body.topic,
          topicMessages: (body.topic.topicMessages || []).map(
            (topicMessage) => ({
              ...topicMessage,
              createdBy: session.user.userId
            })
          ),
          event,
          org,
          createdBy: session.user.userId
        });

        if (!topic) throw new Error("La discussion n'a pas pu être créée");

        if (event) {
          event.eventTopics.push(topic);
          await event.save();
          //log(`POST /topics: event`, event);

          if (topicNotif) {
            event = await event
              .populate({
                path: "eventSubscriptions",
                populate: { path: "user" }
              })
              .execPopulate();

            emailList = await sendTopicNotifications({
              event,
              subscriptions: event.eventSubscriptions,
              topic,
              transport
            });
          }
        } else if (org) {
          org.orgTopics.push(topic);
          await org.save();
          //log(`POST /topics: org`, org);

          if (topicNotif) {
            //#region orgLists
            if (
              Array.isArray(body.topic.topicVisibility) &&
              body.topic.topicVisibility.length > 0
            ) {
              const subscription = await models.Subscription.findOne({
                email: session.user.email
              });

              if (
                !session.user.isAdmin &&
                (!subscription ||
                  !getSubscriberSubscription({ org, subscription }))
              )
                return res
                  .status(400)
                  .json(
                    createServerError(
                      new Error(
                        "Vous devez être adhérent pour inviter des personnes à votre discussion"
                      )
                    )
                  );

              org = org.populate({
                path: "orgLists",
                populate: {
                  path: "subscriptions",
                  populate: { path: "user", select: "-password -securityCode" }
                }
              });

              if (
                body.topic.topicVisibility.find((listName) =>
                  ["Abonnés", "Adhérents"].includes(listName)
                )
              )
                org = org.populate({
                  path: "orgSubscriptions",
                  populate: {
                    path: "user"
                  }
                });

              org = await org.execPopulate();

              let subscriptions = (org.orgLists || [])
                .filter((orgList) =>
                  body.topic.topicVisibility?.find(
                    (listName) =>
                      listName === orgList.listName &&
                      Array.isArray(orgList.subscriptions) &&
                      orgList.subscriptions.length > 0
                  )
                )
                .flatMap(
                  ({ subscriptions }) => subscriptions
                ) as ISubscription[];

              for (const listName of body.topic.topicVisibility)
                if (["Abonnés", "Adhérents"].includes(listName))
                  subscriptions = subscriptions.concat(
                    getSubscriptions(
                      org,
                      listName === "Abonnés"
                        ? SubscriptionTypes.FOLLOWER
                        : SubscriptionTypes.SUBSCRIBER
                    )
                  );

              if (Array.isArray(subscriptions) && subscriptions.length > 0) {
                emailList = await sendTopicNotifications({
                  org,
                  subscriptions: org.orgSubscriptions,
                  topic,
                  transport
                });
              }
            }
            //#endregion
            //#region orgSubscriptions
            else {
              org = await org
                .populate({
                  path: "orgSubscriptions",
                  populate: { path: "user", select: "email userSubscription" }
                })
                .execPopulate();

              emailList = await sendTopicNotifications({
                org,
                subscriptions: org.orgSubscriptions,
                topic,
                transport
              });
            }
            //#endregion
          }
        }
      }
      //#endregion

      //#region creator subscription
      const user = await models.User.findOne({
        _id: toString(topic.createdBy)
      });

      if (user) {
        let subscription = await models.Subscription.findOne({ user });

        if (!subscription)
          subscription = await models.Subscription.create({
            user,
            topics: [{ topic: topic._id, emailNotif: true, pushNotif: true }]
          });

        const topicSubscription = subscription.topics.find(({ topic: t }) =>
          equals(t._id, body.topic!._id)
        );

        if (!topicSubscription) {
          // console.log("no sub for this topic => adding one", subscription);
          subscription.topics = subscription.topics.concat([
            {
              topic: topic._id,
              emailNotif: true,
              pushNotif: true
            }
          ]);
          await subscription.save();
          // console.log("subscription saved", subscription);
        }
      }
      //#endregion

      res.status(200).json(emailList);
    } catch (error: any) {
      res.status(500).json(createServerError(error));
    }
  }
);

export default handler;

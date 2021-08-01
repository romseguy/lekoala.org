import type { IOrgSubscription, ISubscription } from "models/Subscription";
import type { ITopic } from "models/Topic";
import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import database, { models } from "database";
import { createServerError } from "utils/errors";
import { getSession } from "hooks/useAuth";
import { emailR } from "utils/email";

const handler = nextConnect<NextApiRequest, NextApiResponse>();

handler.use(database);

handler.get<NextApiRequest, NextApiResponse>(async function getSubscription(
  req,
  res
) {
  try {
    const { userId } = req.query as NextApiRequest["query"] & {
      userId: string;
    };

    let selector: { user?: string; email?: string } = { user: userId };

    if (emailR.test(userId)) {
      const user = await models.User.findOne({ email: userId });
      if (user) selector = { user };
      else selector = { email: userId };
    }

    const subscription = await models.Subscription.findOne(selector)
      .populate("user")
      .populate({
        path: "orgs",
        populate: { path: "org" }
      });

    if (subscription) {
      res.status(200).json(subscription);
    } else {
      res
        .status(404)
        .json(
          createServerError(
            new Error("Aucun abonnement trouvé pour cette adresse e-mail")
          )
        );
    }
  } catch (error) {
    res.status(400).json(createServerError(error));
  }
});

handler.put<NextApiRequest, NextApiResponse>(async function editSubscription(
  req,
  res
) {
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
      const {
        query: { userId: subscriptionId }
      } = req;

      let body = req.body;

      const { n, nModified } = await models.Subscription.updateOne(
        { _id: subscriptionId },
        body
      );

      if (nModified === 1) {
        res.status(200).json({});
      } else {
        res
          .status(400)
          .json(
            createServerError(new Error(`L'abonnement n'a pas pu être modifié`))
          );
      }
    } catch (error) {
      res.status(400).json(createServerError(error));
    }
  }
});

handler.delete(async function removeSubscription(req, res) {
  const session = await getSession({ req });

  const {
    query: { userId: subscriptionId }
  } = req;

  try {
    const subscription = await models.Subscription.findOne({
      _id: subscriptionId
    });

    // if (!subscription) {
    //   res
    //     .status(400)
    //     .json(
    //       createServerError(
    //         new Error(`L'abonnement n'a pas pu être trouvé`)
    //       )
    //     );
    // }

    subscription.orgs = subscription.orgs.filter(
      (orgSubscription: IOrgSubscription) => {
        return orgSubscription.orgId.toString() !== req.body.orgs[0].orgId;
      }
    );
    await subscription.save();

    const org = await models.Org.findOne({
      _id: req.body.orgs[0].orgId
    });
    org.orgSubscriptions = org.orgSubscriptions.filter(
      (subscription: ISubscription) => {
        return subscription._id.toString() !== subscriptionId;
      }
    );
    await org.save();

    res.status(200).json(subscription);
  } catch (error) {
    res.status(500).json(createServerError(error));
  }
});

export default handler;

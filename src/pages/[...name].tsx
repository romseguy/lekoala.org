import type { IEvent } from "models/Event";
import type { IUser } from "models/User";
import type { IOrg } from "models/Org";
import React, { useEffect, useState } from "react";
import { GetServerSidePropsContext } from "next";
import { Alert, AlertIcon, Text } from "@chakra-ui/react";
import api from "utils/api";
import { EventPage } from "features/events/EventPage";
import { Layout } from "features/layout";
import { OrgPage } from "features/orgs/OrgPage";
import { User } from "features/users/UserPage";
import { useRouter } from "next/router";
import { isServer } from "utils/isServer";
import { Forum } from "features/forum/Forum";
import { wrapper } from "store";
import { getSession } from "hooks/useAuth";
import { getEvent } from "features/events/eventsApi";
import { getOrg } from "features/orgs/orgsApi";
import { getUser } from "features/users/usersApi";

const Hash = ({
  event,
  org,
  user,
  routeName,
  error
}: {
  event?: IEvent;
  org?: IOrg;
  user?: IUser;
  routeName: string;
  error: any;
}) => {
  const router = useRouter();

  if (routeName === "forum") {
    return <Forum />;
  }

  if (event) {
    return <EventPage event={event} user={user} routeName={routeName} />;
  }

  if (org) {
    return <OrgPage org={org} routeName={routeName} />;
  }

  if (user) {
    return <User user={user} routeName={routeName} />;
  }

  if (!isServer() && !error) {
    setTimeout(() => {
      //router.push("/");
    }, 2000);
  }

  return (
    <Layout pageTitle={error ? "Événement privé" : "Page introuvable"}>
      {error ? (
        <Alert status="error">
          <AlertIcon />
          {error.message}
        </Alert>
      ) : (
        <Text>
          La page demandée n'a pas été trouvée. Vous allez être redirigé vers la
          page d'accueil dans quelques secondes.
        </Text>
      )}
    </Layout>
  );
};

// export async function getServerSideProps(ctx: GetServerSidePropsContext) {
//   let routeName = ctx.query.name![0];

//   if (routeName === "forum") {
//     return { props: { routeName } };
//   }

//   if (routeName.indexOf(" ") !== -1) {
//     const destination = `/${routeName.replace(/\ /g, "_")}`;

//     return {
//       redirect: {
//         permanent: false,
//         destination
//       }
//     };
//   } else if (routeName.indexOf("_") !== -1) {
//     routeName = routeName.replace(/_/g, " ");
//   }

//   const { data: event, error } = await api.get(`event/${routeName}`);

//   if (event) {
//     const { data: user } = await api.get(`user/${event.createdBy._id}`);

//     return {
//       props: { event, user, routeName }
//     };
//   }

//   if (error) {
//     return {
//       props: { error, routeName }
//     };
//   }

//   const { data: org } = await api.get(`org/${routeName}`);

//   if (org) {
//     return { props: { org, routeName } };
//   }

//   const { data: user } = await api.get(`user/${routeName}`);

//   if (user) {
//     return { props: { user, routeName } };
//   }

//   return { props: { routeName } };
// }

export default Hash;

// https://github.com/reduxjs/redux-toolkit/issues/1240
export const getServerSideProps = wrapper.getServerSideProps(
  (store) =>
    async ({ req, res }) => {
      let routeName: string | undefined;

      if (req.url) {
        const matches = req.url.match(/[^/?]*[^/?]/g);

        if (matches) routeName = matches[0];
      }

      if (routeName) {
        // server-side fetching
        const { data: event, ...eventQuery } = await store.dispatch(
          getEvent.initiate({ eventUrl: routeName })
        );

        if (event) {
          return { props: { event, routeName } };
        }

        const { data: org, ...orgQuery } = await store.dispatch(
          getOrg.initiate(routeName)
        );

        if (org) {
          return { props: { org, routeName } };
        }

        const { data: user, ...userQuery } = await store.dispatch(
          getUser.initiate(routeName)
        );

        if (user) {
          return { props: { user, routeName } };
        }
      }

      return Promise.resolve({ props: { routeName } });
    }
);

import { Spinner } from "@chakra-ui/react";
import bcrypt from "bcryptjs";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { wrapper } from "store";
import {
  eventApi,
  GetEventParams,
  useGetEventQuery
} from "features/api/eventsApi";
import { GetOrgParams, orgApi, useGetOrgQuery } from "features/api/orgsApi";
import { useGetSubscriptionQuery } from "features/api/subscriptionsApi";
import {
  useGetUserQuery,
  userApi,
  UserQueryParams
} from "features/api/usersApi";
import { NotFound } from "features/common";
import { EventPage } from "features/events/EventPage";
import { OrgPage } from "features/orgs/OrgPage";
import { OrgPageLogin } from "features/orgs/OrgPageLogin";
import { UserPage } from "features/users/UserPage";
import { useSession } from "hooks/useSession";
import { PageProps } from "main";
import { IEvent } from "models/Event";
import { IOrg } from "models/Org";
import { ISubscription } from "models/Subscription";
import { IUser } from "models/User";
import { selectUserEmail } from "store/userSlice";
import { normalize } from "utils/string";
import { AppQuery, AppQueryWithData } from "utils/types";
import { isServer } from "utils/isServer";
import { Layout } from "features/layout";
import { getRefId } from "models/Entity";

const initialEventQueryParams = (entityUrl: string) => ({
  eventUrl: entityUrl,
  populate: "eventOrgs"
});
const initialOrgQueryParams = (entityUrl: string) => ({
  orgUrl: entityUrl,
  populate:
    "orgBanner orgEvents orgLogo orgLists orgProjects orgSubscriptions orgTopics orgs"
});
const initialUserQueryParams = (entityUrl: string) => ({
  slug: entityUrl
});
const subQueryParams = (email: string) => ({
  email
});

interface HashPageProps extends PageProps {
  entityTab?: string;
}

const HashPage = ({ ...props }: HashPageProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const userEmail = useSelector(selectUserEmail);

  //#region routing
  let [entityUrl, entityTab = "accueil", entityTabItem] =
    "name" in router.query && Array.isArray(router.query.name)
      ? router.query.name
      : [];
  entityTabItem = entityUrl === "forum" ? entityTab : entityTabItem;
  useEffect(
    function onNavigate() {
      setOrgQueryParams({ ...orgQueryParams, orgUrl: entityUrl });
      setEventQueryParams({ ...eventQueryParams, eventUrl: entityUrl });
      setUserQueryParams({ ...userQueryParams, slug: entityUrl });
    },
    [router.asPath]
  );
  //#endregion

  //#region queries parameters
  const [eventQueryParams, setEventQueryParams] = useState<GetEventParams>(
    initialEventQueryParams(entityUrl)
  );
  const [orgQueryParams, setOrgQueryParams] = useState<GetOrgParams>(
    initialOrgQueryParams(entityUrl)
  );
  const [userQueryParams, setUserQueryParams] = useState<UserQueryParams>(
    initialUserQueryParams(entityUrl)
  );
  //#endregion

  //#region queries
  const eventQuery = useGetEventQuery(eventQueryParams) as AppQuery<IEvent>;
  const orgQuery = useGetOrgQuery(orgQueryParams) as AppQuery<IOrg>;
  const subQuery = useGetSubscriptionQuery(
    subQueryParams(userEmail)
  ) as AppQuery<ISubscription>;
  const userQuery = useGetUserQuery({
    slug: entityUrl,
    populate: session?.user.userName === entityUrl ? "userProjects" : undefined
  }) as AppQuery<IUser>;
  //#endregion

  useEffect(() => {
    if (
      orgQuery.data &&
      !orgQuery.data._id &&
      session?.user.userId === getRefId(orgQuery.data)
    ) {
      orgQuery.refetch();
    }
  }, []);

  //#region queries status codes
  const eventQueryStatus = eventQuery.error?.status || 200;
  const orgQueryStatus = orgQuery.error?.status || 200;
  const userQueryStatus = userQuery.error?.status || 200;
  //#endregion

  if (orgQueryStatus === 404 && orgQueryParams.orgUrl === "forum") {
    return (
      <NotFound
        {...props}
        isRedirect={false}
        message="Veuillez ajouter la planète forum."
      />
    );
  }

  if (
    eventQueryStatus === 404 &&
    orgQueryStatus === 404 &&
    userQueryStatus === 404
  ) {
    return <NotFound {...props} />;
  }

  if (eventQuery.data) {
    return (
      <EventPage
        {...props}
        eventQuery={eventQuery as AppQueryWithData<IEvent>}
        subQuery={subQuery}
        tab={entityTab}
        tabItem={entityTabItem}
      />
    );
  }

  if (userQuery.data) {
    return (
      <UserPage {...props} userQuery={userQuery as AppQueryWithData<IUser>} />
    );
  }

  if (
    orgQueryStatus === 403 ||
    (orgQuery.data &&
      !orgQuery.data._id &&
      session?.user.userId !== getRefId(orgQuery.data))
  ) {
    return (
      <OrgPageLogin
        {...props}
        orgQuery={orgQuery as AppQueryWithData<IOrg>}
        status={orgQueryStatus}
        onSubmit={async (orgPassword) => {
          const hash = bcrypt.hashSync(orgPassword, orgQuery.data!.orgSalt);
          setOrgQueryParams({ ...orgQueryParams, hash });
        }}
      />
    );
  }

  if (orgQuery.data) {
    if (orgQuery.data._id) {
      return (
        <OrgPage
          {...props}
          orgQuery={orgQuery as AppQueryWithData<IOrg>}
          subQuery={subQuery}
          tab={entityTab}
          tabItem={entityTabItem}
        />
      );
    }
  }

  return <></>;
};

export const getServerSideProps = wrapper.getServerSideProps(
  (store) => async (ctx) => {
    if (
      Array.isArray(ctx.query.name) &&
      typeof ctx.query.name[0] === "string"
    ) {
      const entityUrl = ctx.query.name[0];
      const normalizedEntityUrl = normalize(entityUrl);

      if (normalizedEntityUrl === "api")
        return {
          redirect: {
            permanent: false,
            destination: "/"
          }
        };

      if (entityUrl !== normalizedEntityUrl)
        return {
          redirect: {
            permanent: false,
            destination: normalizedEntityUrl
          }
        };

      const orgQueryPromise = store.dispatch(
        orgApi.endpoints.getOrg.initiate(initialOrgQueryParams(entityUrl))
      );
      const { data: org } = await orgQueryPromise;
      if (!org) {
        const eventQueryPromise = store.dispatch(
          eventApi.endpoints.getEvent.initiate(
            initialEventQueryParams(entityUrl)
          )
        );
        const { data: event } = await eventQueryPromise;

        if (!event) {
          store.dispatch(
            userApi.endpoints.getUser.initiate(
              initialUserQueryParams(entityUrl)
            )
          );
        }
      }

      if (typeof ctx.query.name[1] === "string") {
        return {
          props: { entityTab: ctx.query.name[1] }
        };
      }
    }

    // await Promise.all(store.dispatch(orgApi.util.getRunningQueriesThunk()));
    // await Promise.all(store.dispatch(eventApi.util.getRunningQueriesThunk()));
    // await Promise.all(store.dispatch(userApi.util.getRunningQueriesThunk()));
    return { props: {} };
  }
);

// export async function getServerSideProps( ctx: GetServerSidePropsContext): Promise<{ props?: {}; redirect?: { permanent: boolean; destination: string }; }> {}

export default HashPage;

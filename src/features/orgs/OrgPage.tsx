import {
  AddIcon,
  ArrowBackIcon,
  EditIcon,
  SettingsIcon
} from "@chakra-ui/icons";
import {
  Box,
  Button,
  Text,
  Heading,
  Grid,
  useToast,
  TabPanels,
  TabPanel,
  Flex,
  Tooltip,
  Alert,
  AlertIcon,
  IconButton,
  useColorMode
} from "@chakra-ui/react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import DOMPurify from "isomorphic-dompurify";
import { Session } from "next-auth";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { css } from "twin.macro";
import {
  EntityInfo,
  GridHeader,
  GridItem,
  IconFooter,
  Link
} from "features/common";
import { DocumentsList } from "features/documents/DocumentsList";
import { EventsList } from "features/events/EventsList";
import { TopicsList } from "features/forum/TopicsList";
import { Layout } from "features/layout";
import { SizeMap } from "features/map/Map";
import { MapContainer } from "features/map/MapContainer";
import { ProjectsList } from "features/projects/ProjectsList";
import {
  useAddSubscriptionMutation,
  useGetSubscriptionQuery
} from "features/subscriptions/subscriptionsApi";
import { SubscriptionPopover } from "features/subscriptions/SubscriptionPopover";
import { selectSubscriptionRefetch } from "features/subscriptions/subscriptionSlice";
import { selectUserEmail } from "features/users/userSlice";
import { useSession } from "hooks/useAuth";
import { Visibility as EventVisibility } from "models/Event";
import { IOrg, orgTypeFull, OrgTypes } from "models/Org";
import {
  getFollowerSubscription,
  getSubscriberSubscription
} from "models/Subscription";
import { hasItems } from "utils/array";
import { OrgConfigPanel } from "./OrgConfigPanel";
import { OrgPageTabs } from "./OrgPageTabs";
import { useEditOrgMutation, useGetOrgQuery, useGetOrgsQuery } from "./orgsApi";
import { selectOrgRefetch } from "./orgSlice";

export type Visibility = {
  isVisible: {
    banner?: boolean;
    logo?: boolean;
    lists?: boolean;
    subscribers?: boolean;
    topics?: boolean;
  };
  setIsVisible: (obj: Visibility["isVisible"]) => void;
};

let cachedRefetchOrg = false;
let cachedRefetchSubscription = false;
let cachedEmail: string | undefined;

export const OrgPage = ({
  populate,
  tab,
  tabItem,
  ...props
}: {
  populate?: string;
  tab?: string;
  tabItem?: string;
  org: IOrg;
  session: Session | null;
}) => {
  const router = useRouter();
  const { data, loading: isSessionLoading } = useSession();
  const session = data || props.session;
  const toast = useToast({ position: "top" });
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";
  const userEmail = useSelector(selectUserEmail) || session?.user.email;

  //#region org
  const [editOrg, editOrgMutation] = useEditOrgMutation();
  const orgQuery = useGetOrgQuery(
    { orgUrl: props.org.orgUrl, populate },
    {
      selectFromResult: (query) => query
    }
  );
  const org = orgQuery.data || props.org;
  const orgs = org.orgs?.filter(({ orgLat, orgLng }) => !!orgLat && !!orgLng);
  const [description, setDescription] = useState<string | undefined>();
  useEffect(() => {
    setIsEdit(false);
    setIsConfig(false);

    if (org.orgDescription && org.orgDescription.length > 0) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(org.orgDescription, "text/html");

      //@ts-expect-error
      const links = doc.firstChild.getElementsByTagName("a");
      for (let i = 0; i < links.length; i++) {
        if (links[i].innerText.includes("http")) links[i].classList.add("clip");
        links[i].setAttribute("title", links[i].innerText);
      }
      setDescription(doc.body.innerHTML);
    }
  }, [org]);

  const { networks } = useGetOrgsQuery(
    { populate: "orgs" },
    {
      selectFromResult: (query) => ({
        networks: query.data?.filter(
          (o) =>
            o.orgName !== org.orgName &&
            o.orgType === OrgTypes.NETWORK &&
            !!o.orgs?.find(({ orgName }) => orgName === org.orgName)
        )
      })
    }
  );

  const orgCreatedByUserName =
    typeof org.createdBy === "object"
      ? org.createdBy.userName || org.createdBy._id
      : "";
  const orgCreatedByUserId =
    typeof org.createdBy === "object" ? org.createdBy._id : "";
  const hasInfo =
    hasItems(org.orgAddress) ||
    hasItems(org.orgEmail) ||
    hasItems(org.orgPhone) ||
    hasItems(org.orgWeb);
  const isCreator =
    session?.user.userId === orgCreatedByUserId ||
    session?.user.isAdmin ||
    false;
  const publicEvents = org.orgEvents.filter(
    (orgEvent) => orgEvent.eventVisibility === EventVisibility.PUBLIC
  );
  const [title = "Événements des 7 prochains jours", setTitle] = useState<
    string | undefined
  >();
  //#endregion

  //#region sub
  const [addSubscription, addSubscriptionMutation] =
    useAddSubscriptionMutation();
  const subQuery = useGetSubscriptionQuery({ email: userEmail });
  const refetchSubscription = useSelector(selectSubscriptionRefetch);
  useEffect(() => {
    if (refetchSubscription !== cachedRefetchSubscription) {
      cachedRefetchSubscription = refetchSubscription;
      console.log("refetching subscription");
      subQuery.refetch();
    }
  }, [refetchSubscription]);
  useEffect(() => {
    if (userEmail !== cachedEmail) {
      cachedEmail = userEmail;
      console.log("refetching subscription with new email", userEmail);
      subQuery.refetch();
    }
  }, [userEmail]);

  const followerSubscription = getFollowerSubscription({ org, subQuery });
  const subscriberSubscription = getSubscriberSubscription({ org, subQuery });
  //#endregion

  //#region local state
  const [isLogin, setIsLogin] = useState(0);
  const [isConfig, setIsConfig] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isVisible, setIsVisible] = useState<Visibility["isVisible"]>({
    logo: false,
    banner: false,
    topics: false,
    subscribers: false
  });
  const [size, setSize] = useState<SizeMap>({
    defaultSize: { enabled: true },
    fullSize: { enabled: false }
  });
  //#endregion

  const refetchOrg = useSelector(selectOrgRefetch);
  useEffect(() => {
    if (refetchOrg !== cachedRefetchOrg) {
      cachedRefetchOrg = refetchOrg;
      console.log("refetching org");
      orgQuery.refetch();
    }
  }, [refetchOrg]);
  useEffect(() => {
    if (userEmail !== cachedEmail) {
      cachedEmail = userEmail;
      console.log("refetching org with new email", userEmail);
      orgQuery.refetch();
    }
  }, [userEmail]);
  // useEffect(() => {
  //   console.log("refetching org with new route", router.asPath);
  //   orgQuery.refetch();
  //   setIsEdit(false);
  // }, [router.asPath]);

  return (
    <Layout org={org} isLogin={isLogin} session={props.session}>
      {isCreator && !isConfig && !isEdit && (
        <Button
          colorScheme="teal"
          leftIcon={<SettingsIcon boxSize={6} data-cy="orgSettings" />}
          onClick={() => setIsConfig(true)}
          mb={5}
        >
          Configuration {orgTypeFull(org.orgType)}
        </Button>
      )}

      {isEdit && (
        <Button
          colorScheme="teal"
          leftIcon={<ArrowBackIcon boxSize={6} />}
          onClick={() => setIsEdit(false)}
        >
          Retour
        </Button>
      )}

      {!isEdit && isConfig && (
        <Button
          colorScheme="teal"
          leftIcon={<ArrowBackIcon boxSize={6} />}
          onClick={() => setIsConfig(false)}
        >
          {`Revenir à la page ${orgTypeFull(org.orgType)}`}
        </Button>
      )}

      {!isConfig && !isEdit && !subQuery.isLoading && (
        <Flex flexDirection="row" flexWrap="wrap" mt={-3}>
          {followerSubscription && (
            <Box mr={3} mt={3}>
              <SubscriptionPopover
                org={org}
                query={orgQuery}
                subQuery={subQuery}
                followerSubscription={followerSubscription}
                //isLoading={subQuery.isLoading || subQuery.isFetching}
              />
            </Box>
          )}

          <Box mt={3}>
            <SubscriptionPopover
              org={org}
              query={orgQuery}
              subQuery={subQuery}
              followerSubscription={followerSubscription}
              notifType="push"
              //isLoading={subQuery.isLoading || subQuery.isFetching}
            />
          </Box>
        </Flex>
      )}

      <Box my={3}>
        <Text fontSize="smaller">
          Organisation ajoutée le{" "}
          {format(parseISO(org.createdAt!), "eeee d MMMM yyyy", {
            locale: fr
          })}{" "}
          par :{" "}
          <Link variant="underline" href={`/${orgCreatedByUserName}`}>
            {orgCreatedByUserName}
          </Link>{" "}
          {isCreator && !session?.user.isAdmin && "(Vous)"}
        </Text>
      </Box>

      {subscriberSubscription && !isConfig && (
        <Alert status="info" mb={3}>
          <AlertIcon />
          <Box>
            Vous êtes adhérent {orgTypeFull(org.orgType)} {org.orgName}.
            <Text fontSize="smaller">
              Vous avez donc accès aux événements, discussions et projets
              réservés aux adhérents.
            </Text>
          </Box>
        </Alert>
      )}

      {!isConfig && !isEdit && (
        <OrgPageTabs org={org} tab={tab}>
          <TabPanels>
            <TabPanel aria-hidden>
              <Grid
                // templateColumns="minmax(425px, 1fr) minmax(200px, 1fr) minmax(200px, 1fr)"
                gridGap={5}
                css={css`
                  @media (max-width: 650px) {
                    & {
                      grid-template-columns: 1fr !important;
                    }
                  }
                `}
              >
                <GridItem
                  light={{ bg: "orange.100" }}
                  dark={{ bg: "gray.600" }}
                  borderTopRadius="lg"
                >
                  <Grid templateRows="auto 1fr">
                    <GridHeader
                      display="flex"
                      alignItems="center"
                      borderTopRadius="lg"
                    >
                      <Heading size="sm" py={3}>
                        Coordonnées
                      </Heading>
                      {hasInfo && isCreator && (
                        <Tooltip
                          placement="bottom"
                          label="Modifier les coordonnées"
                        >
                          <IconButton
                            aria-label="Modifier les coordonnées"
                            icon={<EditIcon />}
                            bg="transparent"
                            _hover={{ color: "green" }}
                            onClick={() => setIsEdit(true)}
                          />
                        </Tooltip>
                      )}
                    </GridHeader>

                    <GridItem
                      light={{ bg: "orange.100" }}
                      dark={{ bg: "gray.600" }}
                    >
                      <Box p={5}>
                        {hasInfo ? (
                          <EntityInfo entity={org} />
                        ) : isCreator ? (
                          <Button
                            colorScheme="teal"
                            leftIcon={<AddIcon />}
                            onClick={() => setIsEdit(true)}
                          >
                            Ajouter
                          </Button>
                        ) : (
                          <Text fontStyle="italic">Aucunes coordonnées.</Text>
                        )}
                      </Box>
                    </GridItem>
                  </Grid>
                </GridItem>

                {Array.isArray(networks) && networks.length > 0 && (
                  <GridItem
                    light={{ bg: "orange.100" }}
                    dark={{ bg: "gray.600" }}
                    borderTopRadius="lg"
                  >
                    <Grid templateRows="auto 1fr">
                      <GridHeader borderTopRadius="lg" alignItems="center">
                        <Heading size="sm" py={3}>
                          Cette organisation fait partie des réseaux suivant :
                        </Heading>
                      </GridHeader>

                      <GridItem
                        light={{ bg: "orange.100" }}
                        dark={{ bg: "gray.600" }}
                      >
                        <Box p={5}>
                          {networks.map((network) => (
                            <Link
                              key={network._id}
                              href={`/${network.orgUrl}`}
                              shallow
                              variant="underline"
                            >
                              {network.orgName}
                            </Link>
                          ))}
                        </Box>
                      </GridItem>
                    </Grid>
                  </GridItem>
                )}

                {org.orgType === OrgTypes.NETWORK && (
                  <GridItem
                    rowSpan={1}
                    borderTopRadius="lg"
                    light={{ bg: "orange.100" }}
                    dark={{ bg: "gray.600" }}
                  >
                    <GridHeader borderTopRadius="lg" alignItems="center">
                      <Flex alignItems="center">
                        <Heading size="sm" py={3}>
                          Carte du réseau
                        </Heading>
                        {isCreator && (
                          <Tooltip
                            placement="bottom"
                            label="Ajouter ou supprimer des organisations du réseau"
                          >
                            <IconButton
                              aria-label="Ajouter ou supprimer des organisations du réseau"
                              icon={<EditIcon />}
                              bg="transparent"
                              _hover={{ color: "green" }}
                              onClick={() => setIsEdit(true)}
                            />
                          </Tooltip>
                        )}
                      </Flex>
                    </GridHeader>
                    <GridItem light={{ bg: "white" }}>
                      <MapContainer
                        orgs={orgs}
                        center={{
                          lat:
                            org.orgLat ||
                            (Array.isArray(orgs) && orgs.length > 0
                              ? orgs[0].orgLat
                              : 46.227638),
                          lng:
                            org.orgLng ||
                            (Array.isArray(orgs) && orgs.length > 0
                              ? orgs[0].orgLng
                              : 2.213749)
                        }}
                      />
                    </GridItem>
                  </GridItem>
                )}

                {/* org.orgDescription */}
                <GridItem
                  rowSpan={1}
                  borderTopRadius="lg"
                  light={{ bg: "orange.100" }}
                  dark={{ bg: "gray.600" }}
                >
                  <GridHeader
                    display="flex"
                    alignItems="center"
                    borderTopRadius="lg"
                  >
                    <Heading size="sm" py={3}>
                      Description {orgTypeFull(org.orgType)}
                    </Heading>
                    {org.orgDescription && isCreator && (
                      <Tooltip
                        placement="bottom"
                        label="Modifier la description"
                      >
                        <IconButton
                          aria-label="Modifier la description"
                          icon={<EditIcon />}
                          bg="transparent"
                          _hover={{ color: "green" }}
                          onClick={() => setIsEdit(true)}
                        />
                      </Tooltip>
                    )}
                  </GridHeader>

                  <GridItem>
                    <Box className="ql-editor" p={5}>
                      {description && description.length > 0 ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(description, {
                              ADD_TAGS: ["iframe"]
                            })
                          }}
                        />
                      ) : isCreator ? (
                        <Button
                          colorScheme="teal"
                          leftIcon={<AddIcon />}
                          onClick={() => setIsEdit(true)}
                        >
                          Ajouter
                        </Button>
                      ) : (
                        <Text fontStyle="italic">Aucune description.</Text>
                      )}
                    </Box>
                  </GridItem>
                </GridItem>
              </Grid>
            </TabPanel>

            <TabPanel aria-hidden>
              <Flex flexWrap="wrap" margin="0 auto" maxWidth="4xl">
                <Box flexGrow={1}>
                  <Heading className="rainbow-text" fontFamily="DancingScript">
                    {title}
                  </Heading>
                </Box>
                <Box width="100%" mt={5}>
                  <EventsList
                    events={!session ? publicEvents : org.orgEvents}
                    org={org}
                    orgQuery={orgQuery}
                    isCreator={isCreator}
                    isSubscribed={!!subscriberSubscription}
                    isLogin={isLogin}
                    setIsLogin={setIsLogin}
                    setTitle={setTitle}
                  />
                  <IconFooter />
                </Box>
              </Flex>
            </TabPanel>

            <TabPanel aria-hidden>
              <ProjectsList
                org={org}
                orgQuery={orgQuery}
                subQuery={subQuery}
                isCreator={isCreator}
                isFollowed={!!followerSubscription}
                isSubscribed={!!subscriberSubscription}
                isLogin={isLogin}
                setIsLogin={setIsLogin}
              />
              <IconFooter />
            </TabPanel>

            <TabPanel aria-hidden>
              <Alert status="info" mb={5}>
                <AlertIcon />
                <Box>
                  Cette section a pour vocation de proposer une alternative plus
                  pratique et respectueuse aux{" "}
                  <Tooltip label="synonymes : mailing lists, newsletters">
                    <Text
                      display="inline"
                      borderBottom={`1px dotted ${isDark ? "white" : "black"}`}
                      cursor="pointer"
                    >
                      listes de diffusion
                    </Text>
                  </Tooltip>{" "}
                  traditionnelles.
                </Box>
              </Alert>

              {process.env.NODE_ENV === "development" && session?.user.isAdmin && (
                <Box mb={5}>
                  <Button
                    onClick={async () => {
                      await editOrg({
                        orgUrl: org.orgUrl,
                        payload: { orgTopics: [] }
                      }).unwrap();
                      orgQuery.refetch();
                    }}
                  >
                    RAZ
                  </Button>
                </Box>
              )}

              <TopicsList
                org={org}
                query={orgQuery}
                mutation={[editOrg, editOrgMutation]}
                subQuery={subQuery}
                isCreator={isCreator}
                isFollowed={!!followerSubscription}
                isSubscribed={!!subscriberSubscription}
                isLogin={isLogin}
                setIsLogin={setIsLogin}
                currentTopicName={tabItem}
              />
              <IconFooter />
            </TabPanel>

            <TabPanel aria-hidden>
              <DocumentsList
                org={org}
                isCreator={isCreator}
                isSubscribed={!!subscriberSubscription}
                isLogin={isLogin}
                setIsLogin={setIsLogin}
              />
              <IconFooter />
            </TabPanel>
          </TabPanels>
        </OrgPageTabs>
      )}

      {session && isCreator && (
        <OrgConfigPanel
          session={session}
          org={org}
          orgQuery={orgQuery}
          subQuery={subQuery}
          isConfig={isConfig}
          isEdit={isEdit}
          isVisible={isVisible}
          setIsConfig={setIsConfig}
          setIsEdit={setIsEdit}
          setIsVisible={setIsVisible}
        />
      )}
    </Layout>
  );
};

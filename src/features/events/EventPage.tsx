import {
  ArrowBackIcon,
  ArrowForwardIcon,
  AtSignIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EditIcon,
  PhoneIcon,
  SettingsIcon
} from "@chakra-ui/icons";
import {
  Box,
  Text,
  Flex,
  Heading,
  Icon,
  Grid,
  Alert,
  AlertIcon,
  useToast,
  Tooltip,
  Tr,
  Td,
  Table,
  Tbody,
  Tag,
  useColorMode,
  TabPanel,
  TabPanels,
  IconButton,
  List,
  ListItem
} from "@chakra-ui/react";
import { IEvent, StatusTypes, StatusTypesV, Visibility } from "models/Event";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "hooks/useAuth";
import { parseISO, format, getHours, addHours, getDate } from "date-fns";
import { fr } from "date-fns/locale";
import DOMPurify from "isomorphic-dompurify";
import { css } from "twin.macro";
import { IoIosPeople } from "react-icons/io";
import { Button, DateRange, GridHeader, GridItem, Link } from "features/common";
import { TopicsList } from "features/forum/TopicsList";
import { Layout } from "features/layout";
import { EventConfigPanel } from "./EventConfigPanel";
import { SubscriptionPopover } from "features/subscriptions/SubscriptionPopover";
import { useSelector } from "react-redux";
import {
  useAddSubscriptionMutation,
  useGetSubscriptionQuery
} from "features/subscriptions/subscriptionsApi";
import { selectUserEmail } from "features/users/userSlice";
import {
  isFollowedBy,
  selectSubscriptionRefetch
} from "features/subscriptions/subscriptionSlice";
import { IOrgSubscription, SubscriptionTypes } from "models/Subscription";
import { EventAttendingForm } from "./EventAttendingForm";
import { EventSendForm } from "features/common/forms/EventSendForm";
import { useGetEventQuery } from "./eventsApi";
import { EventPageTabs } from "./EventPageTabs";
import * as dateUtils from "utils/date";
import getDay from "date-fns/getDay";
import setDay from "date-fns/setDay";
import { hasItems } from "utils/array";
import { selectEventRefetch } from "./eventSlice";
import { FaMapMarkedAlt, FaGlobeEurope } from "react-icons/fa";

const timelineStyles = css`
  & > li {
    list-style: none;
    margin-left: 12px;
    margin-top: 0 !important;
    border-left: 2px dashed #3f4e58;
    padding: 0 0 0 20px;
    position: relative;

    &::before {
      position: absolute;
      left: -14px;
      top: 0;
      content: " ";
      border: 8px solid rgba(255, 255, 255, 0.74);
      border-radius: 500%;
      background: #3f4e58;
      height: 25px;
      width: 25px;
      transition: all 500ms ease-in-out;
    }
  }
`;

export type Visibility = {
  isVisible: {
    logo: boolean;
    topics: boolean;
    banner: boolean;
  };
  setIsVisible: (obj: Visibility["isVisible"]) => void;
};

export const EventPage = ({ ...props }: { event: IEvent }) => {
  const router = useRouter();
  const { data: session, loading: isSessionLoading } = useSession();
  const toast = useToast({ position: "top" });
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";
  const userEmail = useSelector(selectUserEmail) || session?.user.email;

  //#region event
  const eventQuery = useGetEventQuery(
    { eventUrl: props.event.eventUrl },
    {
      selectFromResult: (query) => query
    }
  );
  const event = eventQuery.data || props.event;
  const refetchEvent = useSelector(selectEventRefetch);

  useEffect(() => {
    console.log("refetching event");
    eventQuery.refetch();
    setIsEdit(false);
  }, [router.asPath, refetchEvent]);

  const eventCreatedByUserName =
    event.createdBy && typeof event.createdBy === "object"
      ? event.createdBy.userName || event.createdBy._id
      : "";
  const eventCreatedByUserId =
    event.createdBy && typeof event.createdBy === "object"
      ? event.createdBy._id
      : "";
  const isCreator =
    session?.user.userId === eventCreatedByUserId || session?.user.isAdmin;

  const eventMinDate = parseISO(event.eventMinDate);
  const eventMaxDate = parseISO(event.eventMaxDate);
  let startDay: number = getDay(eventMinDate);
  startDay = startDay === 0 ? 6 : startDay - 1;
  const startHour = getHours(eventMinDate);
  const endHour = getHours(eventMaxDate);
  const duration = endHour - startHour;
  const timeline: { [index: number]: { startDate: Date; endTime: Date } } =
    dateUtils.days.reduce((obj, label, index) => {
      if (startDay === index)
        return {
          ...obj,
          [index]: {
            startDate: eventMinDate,
            endTime: eventMaxDate
          }
        };

      if (event.otherDays) {
        for (const { dayNumber, startDate } of event.otherDays) {
          if (dayNumber === index) {
            return {
              ...obj,
              [index]: {
                startDate: startDate
                  ? parseISO(startDate)
                  : setDay(eventMinDate, dayNumber + 1),
                endTime: startDate
                  ? addHours(parseISO(startDate), duration)
                  : setDay(eventMaxDate, dayNumber + 1)
              }
            };
          }
        }
      }

      return obj;
    }, {});
  //#endregion

  //#region sub
  const [addSubscription, addSubscriptionMutation] =
    useAddSubscriptionMutation();
  const subQuery = useGetSubscriptionQuery(userEmail);
  const subscriptionRefetch = useSelector(selectSubscriptionRefetch);
  useEffect(() => {
    console.log("refetching subscription");
    subQuery.refetch();
  }, [subscriptionRefetch, userEmail]);

  const isFollowed = isFollowedBy({ event, subQuery });
  const isSubscribedToAtLeastOneOrg =
    isCreator ||
    !!subQuery.data?.orgs.find((orgSubscription: IOrgSubscription) => {
      for (const org of event.eventOrgs) {
        if (
          org._id === orgSubscription.orgId &&
          orgSubscription.type === SubscriptionTypes.SUBSCRIBER
        )
          return true;
      }

      return false;
    });
  //#endregion

  //#region local state
  const [email, setEmail] = useState(userEmail);
  const [isLogin, setIsLogin] = useState(0);
  const [isConfig, setIsConfig] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isVisible, setIsVisible] = useState<Visibility["isVisible"]>({
    topics: false,
    banner: false,
    logo: false
  });
  const [showSendForm, setShowSendForm] = useState(false);
  let showAttendingForm = false;

  if (session) {
    if (!isCreator && isSubscribedToAtLeastOneOrg) showAttendingForm = true;
  } else {
    if (event.eventVisibility === Visibility.SUBSCRIBERS) {
      if (!!event.eventNotified?.find((notified) => notified.email === email))
        showAttendingForm = true;
    } else {
      showAttendingForm = true;
    }
  }
  //#endregion

  const renderTimeline = () =>
    Object.keys(timeline).map((key) => {
      const dayNumber = parseInt(key);
      const day = timeline[dayNumber];

      return (
        <ListItem key={"timeline-item-" + key}>
          <Text fontWeight="bold">
            {format(day.startDate, "cccc d MMMM", { locale: fr })}
          </Text>
          <Box display="flex" alignItems="center" ml={3} fontWeight="bold">
            <Text color="green">
              {format(day.startDate, "H:mm", { locale: fr })}
            </Text>
            <ArrowForwardIcon />
            <Text color="red">
              {getDay(day.startDate) !== getDay(day.endTime)
                ? format(day.endTime, "cccc d MMMM", { locale: fr })
                : ""}{" "}
              {format(day.endTime, "H:mm", { locale: fr })}
            </Text>
          </Box>
        </ListItem>
      );
    });

  return (
    <Layout
      event={event}
      //pageSubTitle={<DateRange minDate={eventMinDate} maxDate={eventMaxDate} />}
      isLogin={isLogin}
    >
      {isCreator && !isConfig ? (
        <Button
          aria-label="Paramètres"
          colorScheme="green"
          leftIcon={<SettingsIcon boxSize={6} data-cy="eventSettings" />}
          onClick={() => setIsConfig(true)}
          mb={2}
        >
          Paramètres de l'événement
        </Button>
      ) : isConfig && !isEdit ? (
        <Button
          leftIcon={<ArrowBackIcon boxSize={6} />}
          onClick={() => setIsConfig(false)}
          mb={2}
        >
          Revenir à l'événement
        </Button>
      ) : null}

      {!subQuery.isLoading && !isCreator && !isConfig && (
        <Flex>
          <>
            {isFollowed && (
              <Box mr={3}>
                <SubscriptionPopover
                  event={event}
                  query={eventQuery}
                  subQuery={subQuery}
                  followerSubscription={isFollowed}
                  //isLoading={subQuery.isLoading || subQuery.isFetching}
                />
              </Box>
            )}
            <SubscriptionPopover
              event={event}
              query={eventQuery}
              subQuery={subQuery}
              followerSubscription={isFollowed}
              //isLoading={subQuery.isLoading || subQuery.isFetching}
            />
          </>
        </Flex>
      )}

      <Box mb={3}>
        <Text fontSize="smaller" pt={1}>
          Événement ajouté le{" "}
          {format(parseISO(event.createdAt!), "eeee d MMMM yyyy", {
            locale: fr
          })}{" "}
          par :{" "}
          <Link variant="underline" href={`/${eventCreatedByUserName}`}>
            {eventCreatedByUserName}
          </Link>{" "}
          {isCreator && "(Vous)"}
        </Text>
      </Box>

      {isCreator && !event.isApproved && (
        <Alert status="info" mb={3}>
          <AlertIcon />
          <Box>
            <Text>Votre événement est en attente de modération.</Text>
            <Text fontSize="smaller">
              Vous devez attendre son approbation avant de pouvoir envoyer un
              e-mail d'invitation aux adhérents des organisateurs.
            </Text>
          </Box>
        </Alert>
      )}

      {event.eventVisibility === Visibility.SUBSCRIBERS && !isConfig && (
        <Alert
          status={isSubscribedToAtLeastOneOrg ? "success" : "warning"}
          mb={3}
        >
          <AlertIcon />
          <Box>
            <Text as="h3">
              Cet événement est reservé aux adhérents des organisations
              suivantes :{" "}
              {event.eventOrgs.map((org) => (
                <Link key={org._id} href={org.orgUrl} shallow>
                  <Tag mx={1}>{org.orgName}</Tag>
                </Link>
              ))}
            </Text>
          </Box>
        </Alert>
      )}

      {showAttendingForm && (
        <EventAttendingForm
          email={email}
          setEmail={setEmail}
          event={event}
          eventQuery={eventQuery}
        />
      )}

      {!isConfig && (
        <EventPageTabs isCreator={isCreator}>
          <TabPanels>
            <TabPanel aria-hidden>
              <Grid
                // templateColumns="minmax(425px, 1fr) minmax(200px, 1fr) minmax(200px, 1fr)"
                gridGap={5}
                css={css`
                  & {
                    grid-template-columns: minmax(425px, 1fr) minmax(170px, 1fr);
                  }
                  @media (max-width: 700px) {
                    & {
                      grid-template-columns: 1fr !important;
                    }
                  }
                `}
              >
                <GridItem
                  rowSpan={3}
                  borderTopRadius="lg"
                  light={{ bg: "orange.100" }}
                  dark={{ bg: "gray.500" }}
                >
                  <GridHeader borderTopRadius="lg" alignItems="center">
                    <Flex flexDirection="row" alignItems="center">
                      <Heading size="sm" py={3}>
                        Description de l'événement
                      </Heading>
                      {event.eventDescription && isCreator && (
                        <Tooltip
                          placement="bottom"
                          label="Modifier la description"
                        >
                          <IconButton
                            aria-label="Modifier la description"
                            icon={<EditIcon />}
                            bg="transparent"
                            ml={3}
                            _hover={{ color: "green" }}
                            onClick={() => {
                              setIsConfig(true);
                              setIsEdit(true);
                            }}
                          />
                        </Tooltip>
                      )}
                    </Flex>
                  </GridHeader>

                  <GridItem>
                    <Box className="ql-editor" p={5}>
                      {event.eventDescription &&
                      event.eventDescription.length > 0 ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(event.eventDescription)
                          }}
                        />
                      ) : isCreator ? (
                        <Link
                          onClick={() => {
                            setIsConfig(true);
                            setIsEdit(true);
                          }}
                          variant="underline"
                        >
                          Cliquez ici pour ajouter la description de
                          l'événement.
                        </Link>
                      ) : (
                        <Text fontStyle="italic">Aucune description.</Text>
                      )}
                    </Box>
                  </GridItem>
                </GridItem>

                <GridItem
                  light={{ bg: "orange.100" }}
                  dark={{ bg: "gray.500" }}
                  borderTopRadius="lg"
                >
                  <Grid templateRows="auto 1fr">
                    <GridHeader borderTopRadius="lg" alignItems="center">
                      <Heading size="sm" py={3}>
                        Quand ?
                      </Heading>
                    </GridHeader>

                    <GridItem
                      light={{ bg: "orange.100" }}
                      dark={{ bg: "gray.500" }}
                    >
                      <Box ml={3} pt={3}>
                        {event.repeat && (
                          <Text fontWeight="bold">
                            <CalendarIcon mr={1} />
                            {event.repeat === 99
                              ? "Toutes les semaines"
                              : "todo"}
                          </Text>
                        )}
                        <List spacing={3} css={timelineStyles}>
                          {renderTimeline()}
                        </List>
                      </Box>
                    </GridItem>
                  </Grid>
                </GridItem>

                <GridItem
                  light={{ bg: "orange.100" }}
                  dark={{ bg: "gray.500" }}
                  borderTopRadius="lg"
                >
                  <Grid templateRows="auto 1fr">
                    <GridHeader borderTopRadius="lg" alignItems="center">
                      <Heading size="sm" py={3}>
                        Coordonnées
                      </Heading>
                    </GridHeader>

                    <GridItem
                      light={{ bg: "orange.100" }}
                      dark={{ bg: "gray.500" }}
                    >
                      <Box p={5}>
                        {event.eventAddress && (
                          <Flex flexDirection="column">
                            <Flex alignItems="center">
                              <Icon as={FaMapMarkedAlt} mr={3} />
                              {event.eventAddress}
                            </Flex>
                          </Flex>
                        )}

                        {event.eventEmail && (
                          <Flex flexDirection="column">
                            {event.eventEmail?.map(({ email }, index) => (
                              <Flex key={`phone-${index}`} alignItems="center">
                                <AtSignIcon mr={3} />
                                <a href={`mailto:${email}`}>{email}</a>
                              </Flex>
                            ))}
                          </Flex>
                        )}

                        {event.eventPhone && (
                          <Flex flexDirection="column">
                            {event.eventPhone?.map(({ phone }, index) => (
                              <Flex key={`phone-${index}`} alignItems="center">
                                <PhoneIcon mr={3} />
                                {phone}
                              </Flex>
                            ))}
                          </Flex>
                        )}

                        {event.eventWeb && (
                          <Flex flexDirection="column">
                            {event.eventWeb?.map(({ url, prefix }, index) => (
                              <Flex key={`phone-${index}`} alignItems="center">
                                <Icon as={FaGlobeEurope} mr={3} />
                                <Link variant="underline" href={prefix + url}>
                                  {url}
                                </Link>
                              </Flex>
                            ))}
                          </Flex>
                        )}
                      </Box>
                    </GridItem>
                  </Grid>
                </GridItem>

                <GridItem
                  light={{ bg: "orange.100" }}
                  dark={{ bg: "gray.500" }}
                  borderTopRadius="lg"
                >
                  <Grid templateRows="auto 1fr">
                    <GridHeader borderTopRadius="lg" alignItems="center">
                      <Heading size="sm" py={3}>
                        Organisé par
                      </Heading>
                    </GridHeader>

                    <GridItem
                      light={{ bg: "orange.100" }}
                      dark={{ bg: "gray.500" }}
                    >
                      <Box p={5}>
                        {hasItems(event.eventOrgs) ? (
                          event.eventOrgs.map((eventOrg, index) => (
                            <Flex key={eventOrg._id} mb={2} alignItems="center">
                              <Icon as={IoIosPeople} mr={2} />
                              <Link
                                data-cy={`eventCreatedBy-${eventOrg.orgName}`}
                                variant="underline"
                                href={`/${eventOrg.orgUrl}`}
                                shallow
                              >
                                {`${eventOrg.orgName}`}
                                {/* {`${eventOrg.orgName}${
                            index < event.eventOrgs!.length - 1 ? ", " : ""
                          }`} */}
                              </Link>
                            </Flex>
                          ))
                        ) : (
                          <Flex alignItems="center">
                            <Icon as={AtSignIcon} mr={2} />
                            <Link
                              variant="underline"
                              href={`/${eventCreatedByUserName}`}
                            >
                              {eventCreatedByUserName}
                            </Link>
                          </Flex>
                        )}
                      </Box>
                    </GridItem>
                  </Grid>
                </GridItem>
              </Grid>
            </TabPanel>

            <TabPanel aria-hidden>
              <TopicsList
                event={event}
                query={eventQuery}
                subQuery={subQuery}
                isCreator={isCreator}
                isFollowed={!!isFollowed}
                isLogin={isLogin}
                setIsLogin={setIsLogin}
              />
            </TabPanel>

            {isCreator && (
              <TabPanel aria-hidden>
                <Button
                  colorScheme="teal"
                  rightIcon={
                    showSendForm ? <ChevronDownIcon /> : <ChevronRightIcon />
                  }
                  onClick={() => {
                    if (!event.isApproved)
                      alert(
                        "L'événement doit être vérifié par un modérateur avant de pouvoir envoyer des invitations."
                      );
                    else setShowSendForm(!showSendForm);
                  }}
                >
                  Envoyer les invitations
                </Button>

                {showSendForm && session && (
                  <EventSendForm
                    event={event}
                    eventQuery={eventQuery}
                    session={session}
                    onSubmit={() => setShowSendForm(false)}
                  />
                )}

                <Box
                  light={{ bg: "orange.100" }}
                  dark={{ bg: "gray.500" }}
                  overflowX="auto"
                  mt={5}
                >
                  {!event.eventNotified ||
                  (Array.isArray(event.eventNotified) &&
                    !event.eventNotified.length) ? (
                    <Text>Aucune invitation envoyée.</Text>
                  ) : (
                    <Table>
                      <Tbody>
                        {event.eventNotified?.map(({ email: e, status }) => {
                          return (
                            <Tr key={e}>
                              <Td>{e}</Td>
                              <Td>
                                <Tag
                                  variant="solid"
                                  colorScheme={
                                    status === StatusTypes.PENDING
                                      ? "blue"
                                      : status === StatusTypes.OK
                                      ? "green"
                                      : "red"
                                  }
                                >
                                  {StatusTypesV[status]}
                                </Tag>
                              </Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  )}
                </Box>
              </TabPanel>
            )}
          </TabPanels>
        </EventPageTabs>
      )}

      {session && isConfig && (
        <EventConfigPanel
          session={session}
          event={event}
          eventQuery={eventQuery}
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

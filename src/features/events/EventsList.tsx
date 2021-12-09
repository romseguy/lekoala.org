import { AddIcon } from "@chakra-ui/icons";
import {
  Alert,
  AlertIcon,
  Button,
  Flex,
  BoxProps,
  Heading,
  Table,
  Tbody,
  Tr,
  Td,
  useColorMode,
  useToast
} from "@chakra-ui/react";
import {
  addWeeks,
  compareAsc,
  format,
  isBefore,
  parseISO,
  getDayOfYear,
  setDay,
  getHours,
  getMinutes,
  setHours,
  setMinutes,
  setSeconds
} from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
import { LatLon } from "use-places-autocomplete";
import { GridHeader, GridItem, Spacer, LocationButton } from "features/common";
import { ModalState, EntityNotifModal } from "features/modals/EntityNotifModal";
import { EntityModal } from "features/modals/EntityModal";
import { EventFormModal } from "features/modals/EventFormModal";
import { ForwardModal } from "features/modals/ForwardModal";
import { MapModal } from "features/modals/MapModal";
import { useEditOrgMutation } from "features/orgs/orgsApi";
import { refetchOrg } from "features/orgs/orgSlice";
import { useSession } from "hooks/useAuth";
import { IEvent, Visibility } from "models/Event";
import { IOrg, orgTypeFull } from "models/Org";
import { SubscriptionTypes } from "models/Subscription";
import { useAppDispatch } from "store";
import { getNthDayOfMonth, moveDateToCurrentWeek } from "utils/date";
import { getDistance } from "utils/maps";
import {
  useDeleteEventMutation,
  useEditEventMutation,
  usePostEventNotifMutation
} from "./eventsApi";
import { EventsListItem } from "./EventsListItem";
import { EventsListToggle } from "./EventsListToggle";
import { EventCategory } from "./EventCategory";
import { EventsListCategories } from "./EventsListCategories";
import { EventsListDistance } from "./EventsListDistance";

export const EventsList = ({
  events,
  eventsQuery,
  org,
  orgQuery,
  isCreator,
  isSubscribed,
  isLogin,
  setIsLogin,
  setTitle,
  ...props
}: BoxProps & {
  events: IEvent[];
  eventsQuery?: any;
  org?: IOrg;
  orgQuery?: any;
  isCreator?: boolean;
  isSubscribed?: boolean;
  isLogin: number;
  setIsLogin: (isLogin: number) => void;
  setTitle?: (title?: string) => void;
}) => {
  const router = useRouter();
  const { data: session, loading: isSessionLoading } = useSession();
  const toast = useToast({ position: "top" });
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";
  const dispatch = useAppDispatch();

  //#region event
  const [deleteEvent, deleteQuery] = useDeleteEventMutation();
  const [editEvent, editEventMutation] = useEditEventMutation();
  const [editOrg, editOrgMutation] = useEditOrgMutation();
  const postEventNotifMutation = usePostEventNotifMutation();
  //#endregion

  //#region org
  const orgFollowersCount = org?.orgSubscriptions
    .map(
      (subscription) =>
        (subscription.orgs || []).filter((orgSubscription) => {
          return (
            orgSubscription.orgId === org?._id &&
            orgSubscription.type === SubscriptionTypes.FOLLOWER
          );
        }).length
    )
    .reduce((a, b) => a + b, 0);
  //#endregion

  //#region local storage sync
  const [city, setCity] = useState<string | null>(null);
  useEffect(() => {
    if (city) localStorage.setItem("city", city);
  }, [city]);
  const [distance, setDistance] = useState<number>(0);

  useEffect(() => {
    if (distance) localStorage.setItem("distance", "" + distance);
  }, [distance]);
  const [origin, setOrigin] = useState<LatLon | undefined>();
  useEffect(() => {
    if (origin) {
      localStorage.setItem("lat", origin.lat.toFixed(6));
      localStorage.setItem("lng", origin.lng.toFixed(6));
    }
  }, [origin]);

  useEffect(() => {
    const storedCity = localStorage.getItem("city");
    const storedDistance = localStorage.getItem("distance");
    const storedLat = localStorage.getItem("lat");
    const storedLng = localStorage.getItem("lng");

    if (storedCity && storedCity !== city) setCity(storedCity);

    if (storedDistance && parseInt(storedDistance) !== distance)
      setDistance(parseInt(storedDistance));

    if (storedLat && storedLng) {
      if (!origin)
        setOrigin({
          lat: parseFloat(storedLat),
          lng: parseFloat(storedLng)
        });
      else if (
        origin.lat !== parseFloat(storedLat) ||
        origin.lng !== parseFloat(storedLng)
      )
        setOrigin({
          lat: parseFloat(storedLat),
          lng: parseFloat(storedLng)
        });
    }
  }, []);
  //#endregion

  //#region local state
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const selectedCategoriesCount = selectedCategories
    ? selectedCategories.length
    : 0;
  const [showLocationButton, setShowLocationButton] = useState(!!city);
  const [showPreviousEvents, setShowPreviousEvents] = useState(false);
  const [showNextEvents, setShowNextEvents] = useState(false);
  useEffect(() => {
    if (setTitle) {
      if (showPreviousEvents) setTitle("Événements précédents");
      else if (showNextEvents) setTitle("Événements suivants");
      else setTitle();
    }
  }, [showPreviousEvents, showNextEvents]);

  const today = setSeconds(setMinutes(setHours(new Date(), 0), 0), 0);
  const [isEventFormModalOpen, setIsEventFormModalOpen] = useState(false);
  const [eventToShow, setEventToShow] = useState<IEvent | null>(null);
  const [eventToShowOnMap, setEventToShowOnMap] = useState<IEvent<
    string | Date
  > | null>(null);
  const [eventToForward, setEventToForward] = useState<IEvent | null>(null);
  const [notifyModalState, setNotifyModalState] = useState<
    ModalState<IEvent<string | Date>>
  >({
    entity: null
  });
  useEffect(() => {
    if (notifyModalState.entity) {
      const event = events.find(
        ({ _id }) => _id === notifyModalState.entity!._id
      );
      setNotifyModalState({ entity: event || null });
    }
  }, [events]);
  //#endregion

  const getEvents = (events: IEvent[]) => {
    let previousEvents: IEvent<Date>[] = [];
    let currentEvents: IEvent<Date>[] = [];
    let nextEvents: IEvent<Date>[] = [];

    for (let event of events) {
      if (
        event.eventCategory &&
        selectedCategories.length > 0 &&
        !selectedCategories.includes(event.eventCategory)
      )
        continue;

      if (!event.eventCategory && selectedCategories.length > 0) continue;

      if (
        isCreator ||
        event.eventVisibility === Visibility.PUBLIC ||
        (event.eventVisibility === Visibility.SUBSCRIBERS &&
          (isSubscribed || isCreator))
      ) {
        if (origin && event.eventLat && event.eventLng) {
          const d = getDistance(origin, {
            lat: event.eventLat,
            lng: event.eventLng
          });

          if (distance > 0 && d / 1000 > distance) continue;

          const eventDistance =
            d > 1000 ? Math.round(d / 1000) + "km" : d + "m";

          event = {
            ...event,
            eventDistance
          };
        }

        const start = parseISO(event.eventMinDate);
        const end = parseISO(event.eventMaxDate);

        if (!event.repeat) {
          let pushedMonthRepeat = false;

          if (event.otherDays) {
            for (const otherDay of event.otherDays) {
              const eventMinDate = otherDay.startDate
                ? parseISO(otherDay.startDate)
                : setDay(start, otherDay.dayNumber + 1);
              const eventMaxDate = otherDay.endTime
                ? parseISO(otherDay.endTime)
                : setDay(end, otherDay.dayNumber + 1);

              if (
                Array.isArray(otherDay.monthRepeat) &&
                otherDay.monthRepeat.length > 0
              ) {
                for (const monthRepeat of otherDay.monthRepeat) {
                  const NthDayOfMonth = getNthDayOfMonth(
                    new Date(),
                    otherDay.dayNumber === 6 ? 0 : otherDay.dayNumber - 1,
                    monthRepeat + 1
                  );

                  const eventMinDate = setMinutes(
                    setHours(NthDayOfMonth, getHours(start)),
                    getMinutes(start)
                  );
                  const eventMaxDate = end;

                  if (getDayOfYear(NthDayOfMonth) < getDayOfYear(today)) {
                    // console.log(
                    //   "previousEvents.monthRepeat.push",
                    //   event.eventName
                    // );
                    previousEvents.push({
                      ...event,
                      eventMinDate,
                      eventMaxDate
                    });
                  } else {
                    if (isBefore(eventMinDate, addWeeks(today, 1))) {
                      pushedMonthRepeat = true;
                      // console.log(
                      //   "currentEvents.monthRepeat.push",
                      //   event.eventName
                      // );
                      currentEvents.push({
                        ...event,
                        eventMinDate,
                        eventMaxDate
                      });
                    } else {
                      // console.log(
                      //   "nextEvents.monthRepeat.push",
                      //   event.eventName
                      // );
                      nextEvents.push({
                        ...event,
                        eventMinDate,
                        eventMaxDate
                      });
                    }
                  }
                }
              } else {
                if (isBefore(eventMinDate, today)) {
                  // console.log("previousEvents.otherDay.push", event.eventName);
                  previousEvents.push({
                    ...event,
                    eventMinDate,
                    eventMaxDate
                  });
                } else {
                  if (isBefore(eventMinDate, addWeeks(today, 1))) {
                    // console.log("currentEvents.otherDay.push", event.eventName);

                    currentEvents.push({
                      ...event,
                      eventMinDate,
                      eventMaxDate
                    });
                  } else {
                    // console.log("nextEvents.otherDay.push", event.eventName);
                    nextEvents.push({
                      ...event,
                      eventMinDate,
                      eventMaxDate
                    });
                  }
                }
              }
            }
          }

          if (isBefore(start, today)) {
            // console.log("previousEvents.push", event.eventName);
            previousEvents.push({
              ...event,
              eventMinDate: start,
              eventMaxDate: end
            });
          } else {
            if (!pushedMonthRepeat && isBefore(start, addWeeks(today, 1))) {
              // console.log("currentEvents.push", event.eventName, event);
              currentEvents.push({
                ...event,
                eventMinDate: start,
                eventMaxDate: end
              });
            } else {
              // console.log("nextEvents.push", event.eventName);
              nextEvents.push({
                ...event,
                eventMinDate: start,
                eventMaxDate: end
              });
            }
          }
        } else {
          if (event.repeat === 99) {
            let eventMinDate = moveDateToCurrentWeek(start);
            let eventMaxDate = moveDateToCurrentWeek(end);

            if (isBefore(eventMinDate, today)) {
              eventMinDate = addWeeks(eventMinDate, 1);
              eventMaxDate = addWeeks(eventMaxDate, 1);
            }

            // console.log(
            //   "currentEvents.repeat99.push",
            //   event.eventName,
            //   eventMinDate,
            //   eventMaxDate
            // );
            currentEvents.push({
              ...event,
              eventMinDate,
              eventMaxDate
            });

            if (event.otherDays) {
              for (const otherDay of event.otherDays) {
                let eventMinDate = moveDateToCurrentWeek(
                  otherDay.startDate
                    ? parseISO(otherDay.startDate)
                    : setDay(start, otherDay.dayNumber + 1)
                );
                let eventMaxDate = moveDateToCurrentWeek(
                  otherDay.endTime
                    ? parseISO(otherDay.endTime)
                    : setDay(end, otherDay.dayNumber + 1)
                );
                if (isBefore(eventMinDate, today)) {
                  eventMinDate = addWeeks(eventMinDate, 1);
                  eventMaxDate = addWeeks(eventMaxDate, 1);
                }
                // console.log(
                //   "currentEvents.repeat99.otherDay.push",
                //   event.eventName,
                //   eventMinDate,
                //   eventMaxDate
                // );
                currentEvents.push({
                  ...event,
                  eventMinDate,
                  eventMaxDate
                });
              }
            }
          } else {
            for (let i = 1; i <= event.repeat; i++) {
              if (i % event.repeat !== 0) continue;
              const eventMinDate = addWeeks(start, i);
              const eventMaxDate = addWeeks(end, i);

              if (isBefore(today, eventMinDate)) {
                // console.log(`previousEvents.repeat${i}.push`, event.eventName);
                previousEvents.push({
                  ...event,
                  eventMinDate,
                  eventMaxDate
                });
              } else {
                if (isBefore(addWeeks(today, 1), eventMinDate)) {
                  // console.log(`currentEvents.repeat${i}.push`, event.eventName);
                  currentEvents.push({
                    ...event,
                    eventMinDate,
                    eventMaxDate
                  });
                } else {
                  nextEvents.push({
                    ...event,
                    eventMinDate,
                    eventMaxDate
                  });
                }
              }

              if (event.otherDays) {
                for (const otherDay of event.otherDays) {
                  const start = otherDay.startDate
                    ? addWeeks(parseISO(otherDay.startDate), i)
                    : setDay(eventMinDate, otherDay.dayNumber + 1);
                  const end = otherDay.endTime
                    ? addWeeks(parseISO(otherDay.endTime), i)
                    : setDay(eventMaxDate, otherDay.dayNumber + 1);

                  if (isBefore(today, eventMinDate)) {
                    // console.log(
                    //   `previousEvents.repeat${i}.otherDay.push`,
                    //   event.eventName
                    // );
                    previousEvents.push({
                      ...event,
                      eventMinDate: start,
                      eventMaxDate: end,
                      repeat: otherDay.dayNumber + 1
                    });
                  } else {
                    if (isBefore(addWeeks(today, 1), eventMinDate)) {
                      // console.log(
                      //   `currentEvents.repeat${i}.otherDay.push`,
                      //   event.eventName
                      // );
                      currentEvents.push({
                        ...event,
                        eventMinDate: start,
                        eventMaxDate: end
                      });
                    } else {
                      nextEvents.push({
                        ...event,
                        eventMinDate: start,
                        eventMaxDate: end
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return { previousEvents, currentEvents, nextEvents };
  };

  const eventsListItemProps = {
    deleteEvent,
    editEvent,
    editOrg,
    isCreator,
    isDark,
    org,
    orgQuery,
    orgFollowersCount,
    session,
    eventToForward,
    setEventToForward,
    eventToShow,
    setEventToShow,
    eventToShowOnMap,
    setEventToShowOnMap,
    isLoading,
    setIsLoading,
    notifyModalState,
    setNotifyModalState,
    selectedCategories,
    setSelectedCategories,
    city,
    toast
  };

  const eventsList = useMemo(() => {
    let currentDateP: Date | null = null;
    let currentDate: Date | null = null;
    let currentDateN: Date | null = null;
    let { previousEvents, currentEvents, nextEvents } = getEvents(events);

    return (
      <>
        <EventsListToggle
          previousEvents={previousEvents}
          showPreviousEvents={showPreviousEvents}
          setShowPreviousEvents={setShowPreviousEvents}
          currentEvents={currentEvents}
          nextEvents={nextEvents}
          showNextEvents={showNextEvents}
          setShowNextEvents={setShowNextEvents}
          mb={5}
        />

        <EventsListCategories
          events={events}
          org={org}
          orgQuery={orgQuery}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          session={session}
          isLogin={isLogin}
          setIsLogin={setIsLogin}
          mb={5}
        />

        <Flex alignItems="center" mb={5}>
          {!showLocationButton ? (
            <Button
              colorScheme="purple"
              color={isDark ? "black" : "white"}
              leftIcon={<FaMapMarkerAlt />}
              mr={3}
              size="sm"
              onClick={() => {
                setShowLocationButton(!showLocationButton);
              }}
            >
              Définir la ville
            </Button>
          ) : (
            <LocationButton
              colorScheme="purple"
              color={isDark ? "black" : "white"}
              mr={3}
              size="sm"
              city={city}
              setCity={setCity}
              location={origin}
              setLocation={setOrigin}
              inputProps={{
                bg: isDark ? undefined : "white",
                borderColor: isDark ? undefined : "black",
                borderRadius: "lg",
                color: isDark ? undefined : "black",
                mr: 3,
                _placeholder: { color: isDark ? undefined : "black" }
              }}
              //onLocationChange={(coordinates) => setOrigin(coordinates)}
            />
          )}
          <EventsListDistance
            distance={distance}
            setDistance={setDistance}
            borderColor={isDark ? undefined : "black"}
            borderRadius="md"
            size="sm"
          />
        </Flex>

        {showPreviousEvents && (
          <Table>
            <Tbody>
              {previousEvents
                .sort((a, b) => compareAsc(a.eventMinDate, b.eventMinDate))
                .map((event, index) => {
                  const minDate = event.eventMinDate;
                  const addGridHeader =
                    !currentDateP ||
                    getDayOfYear(currentDateP) < getDayOfYear(minDate);
                  currentDateP = minDate;

                  return [
                    <Tr key={`eventsList-header-${index}`}>
                      <Td border={0} colSpan={3} p={0}>
                        {addGridHeader ? (
                          <GridHeader
                            borderTopRadius={index === 0 ? "lg" : undefined}
                          >
                            <Heading size="sm" py={3}>
                              {format(minDate, "cccc d MMMM", {
                                locale: fr
                              })}
                            </Heading>
                          </GridHeader>
                        ) : (
                          <GridItem></GridItem>
                        )}
                      </Td>
                    </Tr>,

                    <Tr
                      key={`eventsList-item-${index}`}
                      bg={
                        isDark
                          ? index % 2 === 0
                            ? "gray.600"
                            : "gray.500"
                          : index % 2 === 0
                          ? "orange.100"
                          : "orange.50"
                      }
                    >
                      <EventsListItem
                        {...eventsListItemProps}
                        event={event}
                        index={index}
                        length={previousEvents.length}
                      />
                    </Tr>
                  ];
                })}
            </Tbody>
          </Table>
        )}

        {!showPreviousEvents && !showNextEvents && (
          <>
            {currentEvents.length > 0 ? (
              <>
                <Table>
                  <Tbody>
                    {currentEvents
                      .sort((a, b) =>
                        compareAsc(a.eventMinDate, b.eventMinDate)
                      )
                      .map((event, index) => {
                        const minDate = event.eventMinDate;
                        const addGridHeader =
                          !currentDate ||
                          getDayOfYear(currentDate) < getDayOfYear(minDate);
                        currentDate = minDate;

                        return [
                          <Tr key={`eventsList-header-${index}`}>
                            <Td border={0} colSpan={3} p={0}>
                              {addGridHeader ? (
                                <GridHeader
                                  borderTopRadius={
                                    index === 0 ? "lg" : undefined
                                  }
                                >
                                  <Heading size="sm" py={3}>
                                    {format(minDate, "cccc d MMMM", {
                                      locale: fr
                                    })}
                                  </Heading>
                                </GridHeader>
                              ) : (
                                <GridItem></GridItem>
                              )}
                            </Td>
                          </Tr>,

                          <Tr
                            key={`eventsList-item-${index}`}
                            bg={
                              isDark
                                ? index % 2 === 0
                                  ? "gray.600"
                                  : "gray.500"
                                : index % 2 === 0
                                ? "orange.100"
                                : "orange.50"
                            }
                          >
                            <EventsListItem
                              {...eventsListItemProps}
                              event={event}
                              index={index}
                              length={currentEvents.length}
                            />
                          </Tr>
                        ];
                      })}
                  </Tbody>
                </Table>
              </>
            ) : (
              <Alert status="warning">
                <AlertIcon />
                Aucun événement{" "}
                {Array.isArray(selectedCategories) &&
                selectedCategoriesCount === 1 ? (
                  <>
                    de la catégorie
                    <EventCategory
                      org={org}
                      selectedCategory={selectedCategories[0]}
                      mx={1}
                    />
                  </>
                ) : selectedCategoriesCount > 1 ? (
                  <>
                    dans les catégories
                    {selectedCategories.map((catNumber, index) => (
                      <EventCategory
                        key={`cat-${index}`}
                        org={org}
                        selectedCategory={catNumber}
                        mx={1}
                      />
                    ))}
                  </>
                ) : (
                  ""
                )}{" "}
                prévu
                {previousEvents.length > 0 || nextEvents.length > 0
                  ? " cette semaine."
                  : "."}
              </Alert>
            )}
          </>
        )}

        {showNextEvents && (
          <Table>
            <Tbody>
              {nextEvents
                .sort((a, b) => compareAsc(a.eventMinDate, b.eventMinDate))
                .map((event, index) => {
                  const minDate = event.eventMinDate;
                  const addGridHeader =
                    !currentDateN ||
                    getDayOfYear(currentDateN) < getDayOfYear(minDate);
                  currentDateN = minDate;

                  return [
                    <Tr key={`eventsList-header-${index}`}>
                      <Td colSpan={3} p={0}>
                        {addGridHeader ? (
                          <GridHeader
                            colSpan={3}
                            borderTopRadius={index === 0 ? "lg" : undefined}
                          >
                            <Heading size="sm" py={3}>
                              {format(minDate, "cccc d MMMM", {
                                locale: fr
                              })}
                            </Heading>
                          </GridHeader>
                        ) : (
                          <GridItem>
                            <Spacer borderWidth={1} />
                          </GridItem>
                        )}
                      </Td>
                    </Tr>,

                    <Tr
                      key={`eventsList-item-${index}`}
                      bg={
                        isDark
                          ? index % 2 === 0
                            ? "gray.600"
                            : "gray.500"
                          : index % 2 === 0
                          ? "orange.100"
                          : "orange.50"
                      }
                    >
                      <EventsListItem
                        {...eventsListItemProps}
                        event={event}
                        index={index}
                        length={nextEvents.length}
                      />
                    </Tr>
                  ];
                })}
            </Tbody>
          </Table>
        )}

        {((showPreviousEvents && previousEvents.length > 0) ||
          showNextEvents ||
          currentEvents.length > 0) && (
          <EventsListToggle
            previousEvents={previousEvents}
            showPreviousEvents={showPreviousEvents}
            setShowPreviousEvents={setShowPreviousEvents}
            currentEvents={currentEvents}
            nextEvents={nextEvents}
            showNextEvents={showNextEvents}
            setShowNextEvents={setShowNextEvents}
            mt={3}
          />
        )}
      </>
    );
  }, [
    events,
    city,
    distance,
    isDark,
    isLoading,
    origin,
    org,
    selectedCategories,
    session,
    showLocationButton,
    showNextEvents,
    showPreviousEvents
  ]);

  return (
    <>
      {org && (
        <>
          <Button
            colorScheme="teal"
            leftIcon={<AddIcon />}
            mb={5}
            onClick={() => {
              if (!isSessionLoading) {
                if (session) {
                  if (org) {
                    if (isCreator || isSubscribed)
                      setIsEventFormModalOpen(true);
                    else
                      toast({
                        status: "error",
                        title: `Vous devez être adhérent ${orgTypeFull(
                          org.orgType
                        )} pour ajouter un événement`
                      });
                  } else setIsEventFormModalOpen(true);
                } else if (setIsLogin && isLogin) {
                  setIsLogin(isLogin + 1);
                }
              }
            }}
            data-cy="addEvent"
          >
            Ajouter un événement
          </Button>

          {session && isEventFormModalOpen && (
            <EventFormModal
              initialEventOrgs={[org]}
              session={session}
              onCancel={() => setIsEventFormModalOpen(false)}
              onSubmit={async (eventUrl) => {
                if (org) {
                  dispatch(refetchOrg());
                }
                await router.push(`/${eventUrl}`, `/${eventUrl}`, {
                  shallow: true
                });
              }}
              onClose={() => setIsEventFormModalOpen(false)}
            />
          )}
        </>
      )}

      {eventsList}

      {eventToForward && (
        <ForwardModal
          event={eventToForward}
          onCancel={() => {
            setEventToForward(null);
          }}
          onClose={() => {
            setEventToForward(null);
          }}
          onSubmit={() => {
            setEventToForward(null);
          }}
        />
      )}

      {eventToShow && (
        <EntityModal
          entity={eventToShow}
          onClose={() => setEventToShow(null)}
        />
      )}

      {eventToShowOnMap &&
        eventToShowOnMap.eventLat &&
        eventToShowOnMap.eventLng && (
          <MapModal
            isOpen
            events={[eventToShowOnMap]}
            center={{
              lat: eventToShowOnMap.eventLat,
              lng: eventToShowOnMap.eventLng
            }}
            zoomLevel={16}
            onClose={() => setEventToShowOnMap(null)}
          />
        )}

      {session && (
        <EntityNotifModal
          event={notifyModalState.entity || undefined}
          org={org}
          query={orgQuery}
          mutation={postEventNotifMutation}
          setModalState={setNotifyModalState}
          modalState={notifyModalState}
          session={session}
        />
      )}
    </>
  );
};

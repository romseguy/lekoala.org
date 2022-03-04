import { AddIcon, CalendarIcon } from "@chakra-ui/icons";
import {
  Box,
  BoxProps,
  Button,
  Icon,
  IconButton,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  PopoverFooter,
  Select,
  Spinner,
  Text,
  VStack,
  useDisclosure
} from "@chakra-ui/react";
import { Session } from "next-auth";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { EntityButton } from "features/common";
import { EventFormModal } from "features/modals/EventFormModal";
import { useGetEventsQuery } from "features/events/eventsApi";
import { useGetSubscriptionQuery } from "features/subscriptions/subscriptionsApi";
import { selectUserEmail } from "features/users/userSlice";
import { EEventInviteStatus } from "models/Event";
import { hasItems } from "utils/array";

const EventPopoverContent = ({
  session,
  onClose
}: {
  session: Session;
  onClose: () => void;
}) => {
  const router = useRouter();
  const userEmail = useSelector(selectUserEmail) || session.user.email;

  //#region events
  const myEventsQuery = useGetEventsQuery(
    { createdBy: session.user.userId },
    {
      selectFromResult: (query) => ({
        ...query,
        data: [...(query.data || [])].sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            if (a.createdAt < b.createdAt) return 1;
            else if (a.createdAt > b.createdAt) return -1;
          }
          return 0;
        })
      })
    }
  );
  const eventsQuery = useGetEventsQuery(void 0, {
    selectFromResult: (query) => ({
      ...query,
      attendedEvents: (query.data || []).filter(({ eventNotifications }) =>
        eventNotifications.find(
          ({ email, status }) =>
            email === email && status === EEventInviteStatus.OK
        )
      )
    })
  });
  const { attendedEvents } = eventsQuery;
  //#endregion

  //#region my sub
  const subQuery = useGetSubscriptionQuery({
    email: userEmail,
    populate: "events"
  });
  const followedEvents = subQuery.data?.events || [];
  //#endregion

  //#region local state
  const {
    isOpen: isModalOpen,
    onOpen: onModalOpen,
    onClose: onModalClose
  } = useDisclosure();
  const [showEvents, setShowEvents] = useState<
    "showEventsAdded" | "showEventsFollowed" | "showEventsAttended"
  >("showEventsAdded");
  //#endregion

  useEffect(() => {
    eventsQuery.refetch();
    myEventsQuery.refetch();
    subQuery.refetch();
  }, []);

  return (
    <>
      {/* <PopoverHeader>
          </PopoverHeader>
          <PopoverCloseButton /> */}
      <PopoverBody>
        <Select
          fontSize="sm"
          height="auto"
          lineHeight={2}
          mb={2}
          defaultValue={showEvents}
          onChange={(e) =>
            setShowEvents(
              e.target.value as
                | "showEventsAdded"
                | "showEventsFollowed"
                | "showEventsAttended"
            )
          }
        >
          <option value="showEventsAdded">
            Les événements que j'ai ajouté
          </option>
          <option value="showEventsFollowed">
            Les événements où je suis abonné
          </option>
          <option value="showEventsAttended">
            Les événements où je participe
          </option>
        </Select>

        {showEvents === "showEventsAdded" && (
          <>
            {myEventsQuery.isLoading || myEventsQuery.isFetching ? (
              <Spinner />
            ) : hasItems(myEventsQuery.data) ? (
              <VStack
                alignItems="flex-start"
                overflow="auto"
                height="200px"
                spacing={2}
              >
                {myEventsQuery.data.map((event) => (
                  <EntityButton
                    key={event._id}
                    event={event}
                    p={1}
                    onClick={() => {
                      onClose();
                      router.push(event.eventUrl);
                    }}
                  />
                ))}
              </VStack>
            ) : (
              <Text fontSize="smaller">
                Vous n'avez ajouté aucun événements.
              </Text>
            )}
          </>
        )}

        {showEvents === "showEventsFollowed" && (
          <>
            {hasItems(followedEvents) ? (
              <VStack
                alignItems="flex-start"
                overflow="auto"
                height="200px"
                spacing={2}
              >
                {followedEvents.map(({ event }) => (
                  <EntityButton key={event._id} event={event} p={1} />
                ))}
              </VStack>
            ) : (
              <Text fontSize="smaller">
                Vous n'êtes abonné à aucun événements.
              </Text>
            )}
          </>
        )}

        {showEvents === "showEventsAttended" && (
          <>
            {hasItems(attendedEvents) ? (
              <VStack
                alignItems="flex-start"
                overflow="auto"
                height="200px"
                spacing={2}
              >
                {attendedEvents.map((event) => (
                  <EntityButton key={event._id} event={event} p={1} />
                ))}
              </VStack>
            ) : (
              <Text fontSize="smaller">
                Vous ne participez à aucun événements.
              </Text>
            )}
          </>
        )}
      </PopoverBody>
      <PopoverFooter>
        <Button
          colorScheme="teal"
          leftIcon={<AddIcon />}
          mt={1}
          size="sm"
          onClick={onModalOpen}
          data-cy="event-add-button"
        >
          Ajouter un événement
        </Button>
      </PopoverFooter>

      {isModalOpen && (
        <EventFormModal
          session={session}
          onCancel={onModalClose}
          onClose={onModalClose}
          onSubmit={async (eventUrl) => {
            onModalClose();
            await router.push(`/${eventUrl}`, `/${eventUrl}`, {
              shallow: true
            });
          }}
        />
      )}
    </>
  );
};

export const EventPopover = ({
  boxSize,
  session,
  ...props
}: BoxProps & {
  session: Session;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Box {...props}>
      <Popover isLazy isOpen={isOpen} offset={[-140, 0]} onClose={onClose}>
        <PopoverTrigger>
          <IconButton
            aria-label="Événements"
            bg="transparent"
            _hover={{ bg: "transparent" }}
            icon={
              <Icon
                as={CalendarIcon}
                boxSize={boxSize}
                _hover={{ color: "green" }}
              />
            }
            minWidth={0}
            onClick={onOpen}
            data-cy="event-popover-button"
          />
        </PopoverTrigger>
        <PopoverContent>
          <EventPopoverContent session={session} onClose={onClose} />
        </PopoverContent>
      </Popover>
    </Box>
  );
};

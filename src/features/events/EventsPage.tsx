import type { IEvent } from "models/Event";
import React, { useEffect, useState } from "react";
import { Flex, IconButton } from "@chakra-ui/react";
import { EventModal } from "features/modals/EventModal";
import { useRouter } from "next/router";
import { Button, IconFooter } from "features/common";
import { AddIcon } from "@chakra-ui/icons";
import { useSession } from "hooks/useAuth";
import { useGetEventsQuery } from "./eventsApi";
import { EventsList } from "./EventsList";
import { MapModal } from "features/modals/MapModal";
import { FaMapMarkerAlt } from "react-icons/fa";
import { isMobile } from "react-device-detect";

export const EventsPage = ({
  isLogin,
  setIsLogin,
  ...props
}: {
  events?: IEvent[];
  isLogin: number;
  setIsLogin: (isLogin: number) => void;
}) => {
  const router = useRouter();
  const query = useGetEventsQuery();
  useEffect(() => {
    console.log("refetching events");
    query.refetch();
  }, [router.asPath]);
  const events = query.data || props.events;

  const { data: session, loading: isSessionLoading } = useSession();

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  return (
    <>
      <>
        <Flex justifyContent="space-between">
          <Button
            colorScheme="teal"
            leftIcon={<AddIcon />}
            mb={5}
            onClick={() => {
              if (!isSessionLoading) {
                if (session) {
                  setIsEventModalOpen(true);
                } else {
                  setIsLogin(isLogin + 1);
                }
              }
            }}
            data-cy="addEvent"
          >
            Ajouter un événement
          </Button>

          {isMobile ? (
            <IconButton
              isDisabled={!events || !events.length}
              aria-label="Carte des événements"
              icon={<FaMapMarkerAlt />}
              onClick={() => setIsMapModalOpen(true)}
            />
          ) : (
            <Button
              isDisabled={!events || !events.length}
              leftIcon={<FaMapMarkerAlt />}
              onClick={() => setIsMapModalOpen(true)}
            >
              Carte des événements
            </Button>
          )}
        </Flex>

        {isEventModalOpen && (
          <EventModal
            onCancel={() => setIsEventModalOpen(false)}
            onSubmit={async (eventName) => {
              //await router.push(`/${eventName}`);
              await router.push(`/${encodeURIComponent(eventName)}`);
            }}
            onClose={() => setIsEventModalOpen(false)}
          />
        )}

        {isMapModalOpen && (
          <MapModal items={events} onClose={() => setIsMapModalOpen(false)} />
        )}
      </>

      {Array.isArray(events) && events.length > 0 ? (
        <div>
          <EventsList events={events} />
          <IconFooter />
        </div>
      ) : null}
    </>
  );
};

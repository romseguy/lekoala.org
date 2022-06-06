import { ArrowBackIcon, EditIcon } from "@chakra-ui/icons";
import { Box, Button, Icon, Input, Text, useToast } from "@chakra-ui/react";
import { Session } from "lib/SessionContext";
import { useRouter } from "next/router";
import React, { useState } from "react";
import {
  Column,
  DeleteButton,
  EntityConfigBannerPanel,
  EntityConfigCategoriesPanel,
  EntityConfigLogoPanel,
  EntityConfigStyles,
  Heading
} from "features/common";
import { useDeleteEventMutation } from "features/events/eventsApi";
import { EventForm } from "features/forms/EventForm";
import { IEvent } from "models/Event";
import { AppQueryWithData, TypedMap } from "utils/types";

export type EventConfigVisibility = {
  isVisible: TypedMap<string, boolean>;
  toggleVisibility: (
    key?: keyof EventConfigVisibility["isVisible"],
    bool?: boolean
  ) => void;
};

export const EventConfigPanel = ({
  session,
  eventQuery,
  isEdit,
  setIsConfig,
  setIsEdit
}: {
  session: Session;
  eventQuery: AppQueryWithData<IEvent>;
  isEdit: boolean;
  setIsConfig: (isConfig: boolean) => void;
  setIsEdit: (isEdit: boolean) => void;
}) => {
  const router = useRouter();
  const toast = useToast({ position: "top" });
  const event = eventQuery.data;
  const [deleteEvent, deleteQuery] = useDeleteEventMutation();
  const [isDisabled, setIsDisabled] = useState(true);
  const _isVisible = {
    banner: false,
    logo: false,
    topicCategories: false
  };
  const [isVisible, _setIsVisible] =
    useState<EventConfigVisibility["isVisible"]>(_isVisible);
  const toggleVisibility = (
    key?: keyof EventConfigVisibility["isVisible"],
    bool?: boolean
  ) =>
    _setIsVisible(
      !key
        ? _isVisible
        : Object.keys(isVisible).reduce((obj, objKey) => {
            if (objKey === key)
              return {
                ...obj,
                [objKey]: bool !== undefined ? bool : !isVisible[key]
              };

            return { ...obj, [objKey]: false };
          }, {})
    );

  return (
    <>
      {isEdit && (
        <Column>
          <EventForm
            session={session}
            event={event}
            onCancel={() => {
              setIsEdit(false);
              setIsConfig(true);
            }}
            onSubmit={async (eventUrl: string) => {
              if (eventUrl !== event.eventUrl)
                await router.push(`/${eventUrl}`, `/${eventUrl}`, {
                  shallow: true
                });
              else {
                setIsEdit(false);
                setIsConfig(false);
              }
            }}
          />
        </Column>
      )}

      {!isEdit && (
        <Box mb={3}>
          <Button
            colorScheme="teal"
            leftIcon={<Icon as={isEdit ? ArrowBackIcon : EditIcon} />}
            mr={3}
            onClick={() => {
              setIsEdit(true);
              toggleVisibility();
            }}
            data-cy="eventEdit"
          >
            Modifier
          </Button>

          <DeleteButton
            isDisabled={isDisabled}
            isLoading={deleteQuery.isLoading}
            header={
              <>
                Vous êtes sur le point de supprimer l'événement
                <Text display="inline" color="red" fontWeight="bold">
                  {` ${event.eventName}`}
                </Text>
              </>
            }
            body={
              <>
                Saisissez le nom de l'événement pour confimer sa suppression :
                <Input
                  autoComplete="off"
                  onChange={(e) =>
                    setIsDisabled(e.target.value !== event.eventName)
                  }
                />
              </>
            }
            onClick={async () => {
              try {
                const deletedEvent = await deleteEvent({
                  eventId: event._id
                }).unwrap();

                if (deletedEvent) {
                  await router.push(`/`);
                  toast({
                    title: `${deletedEvent.eventName} a été supprimé !`,
                    status: "success"
                  });
                }
              } catch (error: any) {
                toast({
                  title: error.data ? error.data.message : error.message,
                  status: "error"
                });
              }
            }}
          />
        </Box>
      )}

      {!isEdit && (
        <>
          <Column mb={3} pt={1}>
            <Heading mb={1}>Apparence</Heading>

            <EntityConfigStyles query={eventQuery} mb={3} />

            <EntityConfigLogoPanel
              query={eventQuery}
              isVisible={isVisible}
              toggleVisibility={toggleVisibility}
              mb={3}
            />

            <EntityConfigBannerPanel
              query={eventQuery}
              isVisible={isVisible}
              toggleVisibility={toggleVisibility}
            />
          </Column>

          <Column pt={1}>
            <Heading>Discussions</Heading>

            <EntityConfigCategoriesPanel
              fieldName="eventTopicCategories"
              categories={event.eventTopicCategories}
              query={eventQuery}
              isVisible={isVisible}
              toggleVisibility={toggleVisibility}
              mb={3}
            />
          </Column>
        </>
      )}
    </>
  );
};

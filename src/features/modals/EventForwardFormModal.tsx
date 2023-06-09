import { CalendarIcon } from "@chakra-ui/icons";
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure
} from "@chakra-ui/react";
import React from "react";
import { Modal } from "features/common";
import { EventForwardForm } from "features/forms/EventForwardForm";
import { IEvent } from "models/Event";
import { Session } from "utils/auth";

export const EventForwardFormModal = (props: {
  event: IEvent<Date>;
  session: Session;
  onCancel?: () => void;
  onClose: () => void;
  onSubmit?: () => void;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure({ defaultIsOpen: true });

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        props.onClose && props.onClose();
        onClose();
      }}
      closeOnOverlayClick
    >
      <ModalOverlay>
        <ModalContent>
          <ModalHeader display="flex" alignItems="center" pb={3}>
            <CalendarIcon mr={3} /> {props.event.eventName}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pt={0}>
            <EventForwardForm {...props} />
          </ModalBody>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
};

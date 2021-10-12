import type { LatLon } from "use-places-autocomplete";
import type { IOrg } from "models/Org";
import type { IEvent } from "models/Event";
import React, { useRef, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Box,
  Text,
  Alert,
  AlertIcon,
  Spinner
} from "@chakra-ui/react";
import { Map } from "features/map/Map";
import { MapSearch } from "features/map/MapSearch";
import { withGoogleApi } from "features/map/GoogleApiWrapper";
import { hasItems } from "utils/array";

export type SizeMap = {
  defaultSize: {
    enabled: boolean;
  };
  fullSize: {
    enabled: boolean;
  };
};

export const MapModal = withGoogleApi({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
})(
  ({
    events,
    orgs,
    ...props
  }: {
    google: any;
    loaded: boolean;
    isOpen: boolean;
    onClose: () => void;
    events?: IEvent[];
    orgs?: IOrg[];
  }) => {
    const isOffline = props.loaded && !props.google;

    const [center, setCenter] = useState<LatLon>();

    const divRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<SizeMap>({
      defaultSize: { enabled: true },
      fullSize: { enabled: false }
    });

    return (
      <Modal
        isOpen={props.isOpen}
        onClose={() => {
          props.onClose && props.onClose();
        }}
        size={size.fullSize.enabled ? "full" : undefined}
        closeOnOverlayClick
      >
        <ModalOverlay>
          <ModalContent
            my={size.fullSize.enabled ? 0 : undefined}
            minHeight={
              !isOffline && size.defaultSize.enabled
                ? "calc(100vh - 180px)"
                : size.fullSize.enabled
                ? "100vh"
                : undefined
            }
          >
            {size.defaultSize.enabled && (
              <>
                <ModalHeader>
                  {`Carte des ${events ? "événements" : "organisations"}`}
                </ModalHeader>
                <ModalCloseButton />
              </>
            )}
            <ModalBody
              ref={divRef}
              p={size.fullSize.enabled ? 0 : undefined}
              display="flex"
              flexDirection="column"
            >
              {props.loaded &&
              props.google &&
              hasItems(events || orgs || []) ? (
                <>
                  <MapSearch
                    setCenter={setCenter}
                    isVisible={size.defaultSize.enabled}
                  />
                  <Map
                    center={center}
                    events={events}
                    orgs={orgs}
                    size={size}
                    onFullscreenControlClick={(isFull: boolean) => {
                      setSize({
                        defaultSize: { enabled: !isFull },
                        fullSize: { enabled: isFull }
                      });
                    }}
                  />
                </>
              ) : isOffline ? (
                <Alert status="error" mb={3}>
                  <AlertIcon />
                  Nous n'avons pas pu charger la carte. Êtes-vous connecté à
                  internet ?
                </Alert>
              ) : !props.loaded ? (
                <Spinner />
              ) : (
                <Text>
                  Il n'y a encore rien à afficher sur cette carte, revenez plus
                  tard !
                </Text>
              )}
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      </Modal>
    );
  }
);

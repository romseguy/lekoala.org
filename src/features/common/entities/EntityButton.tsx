import { CalendarIcon, ChatIcon, LockIcon } from "@chakra-ui/icons";
import {
  Button,
  Icon,
  StyleProps,
  ThemingProps,
  Tooltip,
  TooltipProps
} from "@chakra-ui/react";
import React from "react";
import { FaGlobeEurope, FaTree } from "react-icons/fa";
import { IoIosPeople, IoIosPerson } from "react-icons/io";
import { Link } from "features/common";
import { IEvent } from "models/Event";
import {
  IOrg,
  EOrgType,
  EOrgVisibility,
  orgTypeFull5,
  OrgTypes
} from "models/Org";
import { IUser } from "models/User";
import { ITopic } from "models/Topic";
import { useRouter } from "next/router";

export const EntityButton = ({
  event,
  org,
  topic,
  user,
  onClick,
  tooltipProps,
  ...props
}: ThemingProps<"Button"> &
  StyleProps & {
    event?: Partial<IEvent<any>>;
    org?: Partial<IOrg>;
    topic?: ITopic;
    user?: Partial<IUser>;
    onClick?: null | (() => void);
    tooltipProps?: Partial<TooltipProps>;
  }) => {
  if (!org && !event && !user && !topic) return null;
  const router = useRouter();
  let entityUrl = org
    ? org.orgUrl
    : event
    ? event.eventUrl
    : typeof user === "object"
    ? user.userName
    : "";
  if (topic) {
    entityUrl = `${entityUrl}/discussions/${topic.topicName}`;
  }
  const hasLink = entityUrl !== "" && onClick !== null;

  return (
    <Tooltip
      label={
        hasLink
          ? topic
            ? "Aller à la discussion"
            : org
            ? org.orgUrl === "forum"
              ? "Aller au forum"
              : org.orgType
              ? `Visiter ${orgTypeFull5(org.orgType)}`
              : ""
            : event
            ? "Aller à la page de l'événement"
            : user
            ? "Visiter le soleil de ce koala"
            : ""
          : ""
      }
      hasArrow
      {...tooltipProps}
    >
      <span>
        <Button
          aria-hidden
          cursor={hasLink ? "pointer" : "default"}
          leftIcon={
            <Icon
              as={
                topic
                  ? ChatIcon
                  : org
                  ? org.orgUrl === "forum"
                    ? ChatIcon
                    : org.orgType === EOrgType.NETWORK
                    ? FaGlobeEurope
                    : FaTree
                  : event
                  ? CalendarIcon
                  : user
                  ? IoIosPerson
                  : ChatIcon
              }
              color={
                topic
                  ? "blue.500"
                  : org
                  ? org.orgType === EOrgType.NETWORK
                    ? "blue.500"
                    : "green.500"
                  : event
                  ? "green.500"
                  : "blue.500"
              }
            />
          }
          height="auto"
          m={0}
          p={1}
          pr={2}
          textAlign="left"
          whiteSpace="normal"
          onClick={() => {
            if (onClick) onClick();
            else router.push(entityUrl!, entityUrl, { shallow: true });
          }}
          {...props}
        >
          {topic
            ? topic.topicName
            : org
            ? org.orgUrl === "forum"
              ? "Forum"
              : `${
                  org.orgType === EOrgType.TREETOOLS
                    ? OrgTypes[org.orgType] + " : "
                    : ""
                }${org.orgName}`
            : event
            ? event.eventName
            : user
            ? user.userName
            : ""}

          {topic && topic.topicVisibility.includes("Abonnés") ? (
            <Icon as={IoIosPeople} ml={2} />
          ) : org && org.orgVisibility === EOrgVisibility.PRIVATE ? (
            <Icon as={LockIcon} ml={2} />
          ) : null}
        </Button>
      </span>
    </Tooltip>
  );
};

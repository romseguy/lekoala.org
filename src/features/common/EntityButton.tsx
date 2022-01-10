import { CalendarIcon, ChatIcon } from "@chakra-ui/icons";
import {
  Button,
  StyleProps,
  Icon,
  ThemingProps,
  Tooltip
} from "@chakra-ui/react";
import React from "react";
import { IoIosGitNetwork, IoIosPeople, IoIosPerson } from "react-icons/io";
import { Link } from "features/common";
import { IOrg, orgTypeFull, OrgTypes } from "models/Org";
import { IEvent } from "models/Event";
import { IUser } from "models/User";
import { ITopic } from "models/Topic";
import { useRouter } from "next/router";

export const EntityButton = ({
  event,
  org,
  topic,
  user,
  onClick,
  ...props
}: ThemingProps<"Button"> &
  StyleProps & {
    event?: Partial<IEvent<any>>;
    org?: Partial<IOrg>;
    topic?: Partial<ITopic>;
    user?: Partial<IUser>;
    onClick?: (() => void) | null;
  }) => {
  const router = useRouter();

  if (!org && !event && !user && !topic) return null;

  let entityUrl = org
    ? org.orgName === "forum"
      ? "/forum"
      : org.orgUrl
    : event
    ? event.eventUrl
    : typeof user === "object"
    ? `/${user.userName}`
    : "";
  let hasLink = entityUrl !== "" && onClick !== null;

  if (topic) {
    entityUrl = `/${entityUrl}/discussions/${topic.topicName}`;
  }

  return (
    <Tooltip
      label={
        hasLink
          ? topic
            ? "Aller à la discussion"
            : org
            ? org.orgName === "forum"
              ? "Aller au forum"
              : org.orgType
              ? `Aller à la page ${orgTypeFull(org.orgType)}`
              : ""
            : event
            ? "Aller à la page de l'événement"
            : user
            ? "Aller à la page de l'utilisateur"
            : ""
          : ""
      }
      hasArrow
    >
      <span>
        <Link
          variant={hasLink ? undefined : "no-underline"}
          href={hasLink ? entityUrl : undefined}
          onClick={() => {
            if (onClick) onClick();
            else if (entityUrl && onClick !== null) router.push(entityUrl);
          }}
        >
          <Button
            aria-hidden
            _hover={onClick ? undefined : {}}
            cursor={hasLink ? "pointer" : "default"}
            fontSize="sm"
            leftIcon={
              <Icon
                as={
                  topic
                    ? ChatIcon
                    : org
                    ? org.orgName === "forum"
                      ? ChatIcon
                      : org.orgType === OrgTypes.NETWORK
                      ? IoIosGitNetwork
                      : IoIosPeople
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
                    ? "green.500"
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
            // override
            textAlign="left"
            whiteSpace="normal"
            {...props}
          >
            {topic
              ? topic.topicName
              : org
              ? org.orgName === "forum"
                ? "Forum"
                : org.orgName
              : event
              ? event.eventName
              : user
              ? user.userName
              : ""}
          </Button>
        </Link>
      </span>
    </Tooltip>
  );
};

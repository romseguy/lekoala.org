import {
  Box,
  IconButton,
  Spinner,
  Tag,
  TagLabel,
  Td,
  Tooltip,
  Tr,
  useToast
} from "@chakra-ui/react";
import { DeleteButton } from "features/common";
import { refetchEvent } from "store/eventSlice";
import { getUser } from "features/api/usersApi";
import { orgTypeFull } from "models/Org";
import {
  getFollowerSubscription,
  IOrgSubscription,
  ISubscription,
  EOrgSubscriptionType
} from "models/Subscription";
import router from "next/router";
import React from "react";
import { IoIosPerson } from "react-icons/io";
import { useAppDispatch } from "store";
import { SubscriptionEditPopover } from "./SubscriptionEditPopover";
import { useDeleteSubscriptionMutation } from "features/api/subscriptionsApi";
import { SubscriptionsListProps } from "./SubscriptionsList";

export const SubscriptionsListItem = ({
  org,
  orgQuery,
  subQuery,
  isSubscriptionLoading,
  setIsSubscriptionLoading,
  subscription
}: SubscriptionsListProps & {
  subscription: ISubscription;
}) => {
  const dispatch = useAppDispatch();
  const toast = useToast({ position: "top" });
  const [deleteSubscription, deleteSubscriptionMutation] =
    useDeleteSubscriptionMutation();
  const followerSubscription = getFollowerSubscription({
    org,
    subscription
  }) as IOrgSubscription;

  let { phone, user, orgs = [] } = subscription;
  let userEmail: string | undefined, userName: string | undefined;

  if (typeof user === "object") {
    userEmail = user.email;
    userName = user.userName;
  }

  const email = subscription.email || userEmail;

  return (
    <Tr>
      {orgQuery.isLoading ? (
        <Td>
          <Spinner />
        </Td>
      ) : (
        <>
          <Td whiteSpace="nowrap">
            {followerSubscription && email && (
              <>
                <SubscriptionEditPopover
                  org={org}
                  userEmail={email}
                  isIconOnly
                  isSelf={false}
                  buttonProps={{ mr: 3, "data-cy": "orgSubscriberFollow" }}
                />
                <SubscriptionEditPopover
                  org={org}
                  notifType="push"
                  userEmail={email}
                  isIconOnly
                  isSelf={false}
                  buttonProps={{ mr: 3, "data-cy": "orgSubscriberFollow" }}
                />
              </>
            )}
          </Td>

          <Td width="100%">{phone || email}</Td>

          <Td whiteSpace="nowrap" textAlign="right">
            {/* {isSubscriptionLoading[subscription._id] ? (
          <Spinner boxSize={4} />
        ) : ( */}
            <Box>
              <Tooltip
                label="Aller à la page de l'utilisateur"
                hasArrow
                placement="top"
              >
                <IconButton
                  aria-label="Aller à la page de l'utilisateur"
                  bg="transparent"
                  _hover={{ bg: "transparent", color: "green" }}
                  icon={<IoIosPerson />}
                  height="auto"
                  onClick={async () => {
                    setIsSubscriptionLoading({
                      ...isSubscriptionLoading,
                      [subscription._id]: true
                    });
                    if (userName) {
                      setIsSubscriptionLoading({
                        ...isSubscriptionLoading,
                        [subscription._id]: false
                      });
                      router.push(`/${userName}`, `/${userName}`, {
                        shallow: true
                      });
                    } else {
                      const query = await dispatch(
                        getUser.initiate({
                          slug: phone || email || ""
                        })
                      );

                      if (query.data) {
                        setIsSubscriptionLoading({
                          ...isSubscriptionLoading,
                          [subscription._id]: false
                        });
                        router.push(
                          `/${query.data.userName}`,
                          `/${query.data.userName}`,
                          {
                            shallow: true
                          }
                        );
                      } else {
                        setIsSubscriptionLoading({
                          ...isSubscriptionLoading,
                          [subscription._id]: false
                        });
                        toast({
                          status: "warning",
                          title: `Aucun utilisateur associé à ${
                            phone
                              ? "ce numéro de téléphone"
                              : "cette adresse-email"
                          }`
                        });
                      }
                    }
                  }}
                />
              </Tooltip>

              <DeleteButton
                header={
                  <>
                    Êtes-vous sûr de vouloir supprimer {phone || email}{" "}
                    {orgTypeFull(org.orgType)} {org.orgName} ?
                  </>
                }
                isIconOnly
                onClick={async () => {
                  setIsSubscriptionLoading({
                    ...isSubscriptionLoading,
                    [subscription._id]: true
                  });

                  await deleteSubscription({
                    subscriptionId: subscription._id,
                    orgId: org._id
                  });
                  dispatch(refetchEvent());
                  orgQuery.refetch();
                  subQuery.refetch();

                  setIsSubscriptionLoading({
                    ...isSubscriptionLoading,
                    [subscription._id]: false
                  });
                }}
                hasArrow
                label="Supprimer"
                placement="top"
                data-cy="orgUnsubscribe"
              />
            </Box>
            {/* )} */}
          </Td>
        </>
      )}
    </Tr>
  );
};

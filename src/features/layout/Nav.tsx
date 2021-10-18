import { CalendarIcon, ChatIcon } from "@chakra-ui/icons";
import {
  Button,
  Box,
  Flex,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Icon,
  IconButton,
  useColorMode,
  BoxProps,
  useToast
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { signOut } from "next-auth/client";
import React, { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";
import { FaPowerOff } from "react-icons/fa";
import { IoIosPeople } from "react-icons/io";
import { useSelector } from "react-redux";
import tw, { css } from "twin.macro";

import { Link } from "features/common";
import {
  EventPopover,
  OrgPopover,
  EmailSubscriptionsPopover
} from "features/layout";
import { LoginModal } from "features/modals/LoginModal";
import { refetchSubscription } from "features/subscriptions/subscriptionSlice";
import { useEditUserMutation, useGetUserQuery } from "features/users/usersApi";
import { selectUserEmail, setUserEmail } from "features/users/userSlice";
import { useSession } from "hooks/useAuth";
import { useAppDispatch } from "store";
import { breakpoints } from "theme/theme";
import { isServer } from "utils/isServer";
import { base64ToUint8Array } from "utils/string";
import { setSession } from "features/session/sessionSlice";

interface customWindow extends Window {
  workbox?: any;
}

declare const window: customWindow;

const linkList = css`
  & > button {
    margin: 0 0 0 12px;
  }

  @media (max-width: ${breakpoints.sm}) {
    margin-left: 0;

    button {
      font-size: 0.8rem;
    }

    & > button {
      display: block;
      margin: 0 0 0 12px;
    }
    // & > a:not(:first-of-type) {
    //   margin-top: 12px;
    // }
  }
`;

const buttonList = css`
  margin-left: 20px;
  @media (max-width: ${breakpoints.sm}) {
    margin-left: 0;
  }
`;

export const Nav = ({
  isLogin = 0,
  ...props
}: BoxProps & { isLogin?: number }) => {
  const router = useRouter();
  const { data: session, loading: isSessionLoading } = useSession();
  const toast = useToast({ position: "top" });
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";
  const dispatch = useAppDispatch();

  const userEmail = useSelector(selectUserEmail) || session?.user.email || "";
  const userName = session?.user.userName || "";

  const [editUser, editUserMutation] = useEditUserMutation();
  const userQuery = useGetUserQuery(userEmail);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(
    router.asPath === "/?login" || false
  );

  const styles = css`
    height: auto !important;
    ${isDark
      ? tw`h-24 bg-gradient-to-b from-gray-800 via-green-600 to-gray-800`
      : tw`h-24 bg-gradient-to-b from-white via-yellow-400 to-white`}
  `;

  useEffect(() => {
    if (isLogin !== 0) {
      setIsLoginModalOpen(true);
    }
  }, [isLogin]);

  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  );

  useEffect(() => {
    if (
      !isServer() &&
      "serviceWorker" in navigator &&
      window.workbox !== undefined
    ) {
      navigator.serviceWorker.ready.then((reg) => {
        console.log("sw ready, setting reg");
        setRegistration(reg);

        reg.pushManager.getSubscription().then((sub) => {
          console.log("reg.pushManager.getSubscription", sub);

          if (
            sub
            // !(
            //   sub.expirationTime &&
            //   Date.now() > sub.expirationTime - 5 * 60 * 1000
            // )
          ) {
            setSubscription(sub);
            setIsSubscribed(true);
          }
        });
      });
    }
  }, []);

  return (
    <Flex
      as="nav"
      align="center"
      justify="space-between"
      wrap="nowrap"
      {...props}
      css={styles}
    >
      <Box css={linkList}>
        <Button
          bg="transparent"
          _hover={{
            bg: isDark ? "blackAlpha.400" : "whiteAlpha.600"
          }}
          leftIcon={<CalendarIcon />}
          onClick={() => router.push("/", "/", { shallow: true })}
          data-cy="homeLink"
        >
          Accueil
        </Button>

        <Button
          bg="transparent"
          _hover={{
            bg: isDark ? "blackAlpha.400" : "whiteAlpha.600"
          }}
          leftIcon={<IoIosPeople />}
          onClick={() => router.push("/orgs", "/orgs", { shallow: true })}
        >
          Organisations
        </Button>

        <Button
          bg="transparent"
          _hover={{
            bg: isDark ? "blackAlpha.400" : "whiteAlpha.600"
          }}
          leftIcon={<ChatIcon />}
          onClick={() => router.push("/forum", "/forum", { shallow: true })}
        >
          Forum
        </Button>
      </Box>

      {session ? (
        <Flex justify="flex-end" css={buttonList}>
          <EventPopover boxSize={[6, 8, 8]} session={session} />
          <OrgPopover boxSize={[8, 10, 12]} session={session} />
          <Menu>
            <MenuButton mr={[1, 3]}>
              <Avatar
                boxSize={10}
                name={userName}
                css={css`
                  // &:focus {
                  //   box-shadow: var(--chakra-shadows-outline);
                  // }
                `}
                src={
                  session.user.userImage
                    ? session.user.userImage.base64
                    : undefined
                }
              />
            </MenuButton>

            <MenuList mr={[1, 3]}>
              <MenuItem
                aria-hidden
                command={`${userEmail}`}
                cursor="default"
                _hover={{ bg: isDark ? "gray.700" : "white" }}
              />

              {process.env.NODE_ENV === "development" && (
                <MenuItem
                  aria-hidden
                  command={`${session.user.userId}`}
                  cursor="default"
                  _hover={{ bg: isDark ? "gray.700" : "white" }}
                />
              )}

              <Link href={`/${userName}`} aria-hidden>
                <MenuItem>Ma page</MenuItem>
              </Link>

              {
                /*isMobile*/ true && (
                  <MenuItem
                    isDisabled={
                      registration === null ||
                      userQuery.isLoading ||
                      userQuery.isFetching
                    }
                    onClick={async () => {
                      try {
                        if (isSubscribed && userQuery.data?.userSubscription) {
                          if (!subscription)
                            throw new Error("Une erreur est survenue.");

                          await subscription.unsubscribe();
                          await editUser({
                            payload: { userSubscription: null },
                            userName
                          });
                          setSubscription(null);
                          setIsSubscribed(false);

                          userQuery.refetch();

                          toast({
                            status: "success",
                            title:
                              "Vous ne recevrez plus de notifications mobile"
                          });
                        } else {
                          const sub = await registration!.pushManager.subscribe(
                            {
                              userVisibleOnly: true,
                              applicationServerKey: base64ToUint8Array(
                                process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY
                              )
                            }
                          );
                          setSubscription(sub);
                          setIsSubscribed(true);

                          await editUser({
                            payload: { userSubscription: sub },
                            userName
                          }).unwrap();

                          userQuery.refetch();

                          toast({
                            status: "success",
                            title:
                              "Vous recevrez des notifications mobile en plus des e-mails"
                          });
                        }
                      } catch (error: any) {
                        toast({ status: "error", title: error.message });
                      }
                    }}
                  >
                    {isSubscribed && userQuery.data?.userSubscription
                      ? "Désactiver"
                      : "Activer"}{" "}
                    les notifications mobile
                  </MenuItem>
                )
              }

              {/* 
              <NextLink href="/settings" passHref>
                <MenuItem as={ChakraLink}>Paramètres</MenuItem>
              </NextLink>
              */}

              <MenuItem
                onClick={async () => {
                  const { url } = await signOut({
                    redirect: false,
                    callbackUrl: "/"
                  });
                  dispatch(setUserEmail(null));
                  dispatch(setSession(null));

                  if (process.env.NODE_ENV === "production") router.push(url);
                  else {
                    dispatch(refetchSubscription());
                  }
                }}
              >
                Déconnexion
              </MenuItem>
            </MenuList>
          </Menu>

          {/* <Menu>
            <MenuButton mr={3} onClick={() => console.log("yoyo")}>
              <Icon as={QuestionIcon} w="48px" h="48px" />
            </MenuButton>
          </Menu> */}
        </Flex>
      ) : (
        <Flex justify="flex-end">
          <EmailSubscriptionsPopover boxSize={[8, 10, 10]} />

          {isMobile ? (
            <IconButton
              aria-label="Connexion"
              icon={<Icon as={FaPowerOff} boxSize={[8, 10, 10]} />}
              isLoading={isSessionLoading}
              bg="transparent"
              _hover={{ bg: "transparent" }}
              mx={3}
              onClick={() => setIsLoginModalOpen(true)}
            />
          ) : (
            <Box mr={5} ml={5}>
              <Button
                variant="outline"
                colorScheme="purple"
                isLoading={isSessionLoading}
                onClick={() => setIsLoginModalOpen(true)}
                data-cy="login"
              >
                Connexion
              </Button>
            </Box>
          )}
        </Flex>
      )}

      {isLoginModalOpen && (
        <LoginModal
          onClose={() => {
            setIsLoginModalOpen(false);
            //setIsLogin(false);
          }}
          onSubmit={async (url) => {
            dispatch(setUserEmail(null));
            const login = `${process.env.NEXT_PUBLIC_URL}/?login`;

            if (url === "/?login" || url === login) {
              await router.push("/");
            } else {
              await router.push(url || "/");
            }
          }}
        />
      )}
    </Flex>
  );
};

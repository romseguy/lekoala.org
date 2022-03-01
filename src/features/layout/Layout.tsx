import {
  Box,
  Flex,
  BoxProps,
  useColorMode,
  Tooltip,
  useToast
} from "@chakra-ui/react";
import Head from "next/head";
import { Session } from "next-auth";
import NextNprogress from "nextjs-progressbar";
import React, { useEffect, useState } from "react";
import { css } from "twin.macro";
import { DarkModeSwitch, IconFooter, OfflineIcon } from "features/common";
import { PaypalButton } from "features/common/forms/PaypalButton";
import { Header, Nav, Footer } from "features/layout";
import { ContactFormModal } from "features/modals/ContactFormModal";
import { useSession } from "hooks/useAuth";
import { IEvent } from "models/Event";
import { IOrg } from "models/Org";
import { PageProps } from "pages/_app";
import { breakpoints } from "theme/theme";
import { Base64Image } from "utils/image";
import { useRouter } from "next/router";
import { LoginFormModal } from "features/modals/LoginFormModal";
import {
  resetUserEmail,
  selectUserEmail,
  setUserEmail
} from "features/users/userSlice";
import { useAppDispatch } from "store";
import { useSelector } from "react-redux";

const defaultTitle = process.env.NEXT_PUBLIC_TITLE;
let isNotified = false;

interface customWindow extends Window {
  console: { [key: string]: (...args: any[]) => void };
}

declare const window: customWindow;

export interface LayoutProps {
  logo?: Base64Image;
  banner?: Base64Image & { mode: "dark" | "light" };
  children: React.ReactNode | React.ReactNodeArray;
  isLogin?: number;
  isMobile: boolean;
  pageHeader?: React.ReactNode | React.ReactNodeArray;
  org?: IOrg;
  event?: IEvent;
  pageTitle?: string;
  pageSubTitle?: React.ReactNode;
  session?: Session | null;
}

export const Layout = ({
  isLogin = 0,
  logo,
  banner,
  children,
  pageHeader,
  pageTitle,
  pageSubTitle,
  org,
  event,
  session: serverSession,
  ...props
}: BoxProps & LayoutProps & PageProps) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const userEmail = useSelector(selectUserEmail);
  console.log("userEmail", userEmail);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(
    router.asPath === "/?login" && !serverSession
  );
  useEffect(() => {
    if (isLogin !== 0) setIsLoginModalOpen(true);
  }, [isLogin]);

  const { isMobile } = props;
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";
  const { data: clientSession } = useSession();

  const session = clientSession || serverSession;
  const toast = useToast({ position: "top" });
  const [isOffline, setIsOffline] = useState(false);
  const notify = (title: string) => {
    if (!isNotified) {
      isNotified = true;
      toast({
        status: "error",
        title
      });
    }
  };

  useEffect(() => {
    window.addEventListener("offline", () => setIsOffline(true));
    window.addEventListener("online", () => setIsOffline(false));
    ["error"].forEach(intercept);

    function intercept(method: string) {
      const original = window.console[method];
      window.console[method] = function (...args: any[]) {
        if (
          typeof args[0] === "string" &&
          args[0].includes("quota") &&
          args[0].includes("maps")
        )
          notify(
            "Vous avez dépassé le quota de chargement de cartes, veuillez réessayer plus tard."
          );
        original.apply
          ? original.apply(window.console, args)
          : original(Array.prototype.slice.apply(args).join(" "));
      };
    }
  }, []);

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>
          {org || event || pageTitle
            ? `${defaultTitle} – ${
                org ? org.orgName : event ? event.eventName : pageTitle
              }`
            : defaultTitle}
        </title>
      </Head>

      <Flex
        css={css`
          flex-direction: column;
          flex-grow: 1;

          @media (min-width: ${breakpoints["2xl"]}) {
            margin: 0 auto;
            width: 1180px;
            ${isDark
              ? `
            border-left: 12px solid transparent;
            border-right: 12px solid transparent;
            border-image: linear-gradient(to bottom right, #b827fc 0%, #2c90fc 25%, #b8fd33 50%, #fec837 75%, #fd1892 100%);
            border-image-slice: 1;
            `
              : `
            border-left: 12px solid transparent;
            border-right: 12px solid transparent;
            border-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='100' height='100' viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg'%3E %3ClinearGradient id='g' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23cffffe' /%3E%3Cstop offset='25%25' stop-color='%23f9f7d9' /%3E%3Cstop offset='50%25' stop-color='%23fce2ce' /%3E%3Cstop offset='100%25' stop-color='%23ffc1f3' /%3E%3C/linearGradient%3E %3Cpath d='M1.5 1.5 l97 0l0 97l-97 0 l0 -97' stroke-linecap='square' stroke='url(%23g)' stroke-width='3'/%3E %3C/svg%3E") 1;
            `};
          }
        `}
      >
        <NextNprogress
          color="#29D"
          startPosition={0.3}
          stopDelayMs={200}
          height={3}
          showOnShallow={true}
        />

        <Box position="fixed" right={4} bottom={2}>
          <Tooltip
            placement="top-start"
            label={`Basculer vers le thème ${isDark ? "clair" : "sombre"}`}
            hasArrow
          >
            <Box>
              <DarkModeSwitch />
            </Box>
          </Tooltip>
        </Box>

        {!isMobile && (
          <Box position="fixed" left={4} bottom={2}>
            <Flex alignItems="center">
              <Tooltip
                hasArrow
                label="Un moyen simple de remercier le créateur de ce logiciel libre ♥"
                placement="top-end"
              >
                <Box mt={1}>
                  <PaypalButton />
                </Box>
              </Tooltip>

              <Box ml={2}>
                <IconFooter noContainer />
              </Box>
            </Flex>
          </Box>
        )}

        {isOffline && (
          <Box
            position="fixed"
            right={3}
            top={3}
            bg={isDark ? "whiteAlpha.400" : "blackAlpha.300"}
            borderRadius="lg"
          >
            <OfflineIcon />
          </Box>
        )}

        <Nav
          {...props}
          email={userEmail}
          session={session}
          setIsLoginModalOpen={setIsLoginModalOpen}
          m={3}
        />

        {router.asPath !== "/" && (
          <Header
            event={event}
            org={org}
            defaultTitle={defaultTitle}
            pageTitle={pageTitle}
            pageSubTitle={pageSubTitle}
            m={3}
            mt={0}
          />
        )}

        <Box
          as="main"
          bg={isDark ? "gray.700" : "lightblue"}
          borderRadius="lg"
          flex="1 0 auto"
          m={3}
          mt={0}
          p={5}
        >
          {children}
        </Box>

        <Footer display="flex" alignItems="center" pl={5} pr={5} pb={8}>
          {isMobile && (
            <Flex alignItems="center">
              <Tooltip
                hasArrow
                label="Un moyen simple de remercier le créateur de ce logiciel libre ♥"
                placement="top-end"
              >
                <Box>
                  <PaypalButton />
                </Box>
              </Tooltip>

              <IconFooter ml={3} />
            </Flex>
          )}
        </Footer>
      </Flex>

      <ContactFormModal />

      {isLoginModalOpen && (
        <LoginFormModal
          onClose={() => setIsLoginModalOpen(false)}
          onSubmit={async () => {
            dispatch(resetUserEmail());
            setIsLoginModalOpen(false);
            if (router.asPath.includes("/?login")) {
              await router.push("/", "/", { shallow: true });
            }
          }}
        />
      )}
    </>
  );
};

{
  /*
  const [hasVerticalScrollbar, setHasVerticalScrollbar] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      let scrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      );

      if (scrollHeight >= window.innerHeight) {
        setHasVerticalScrollbar(true);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
  }, []);
*/
}

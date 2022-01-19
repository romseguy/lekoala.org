import { ChatIcon } from "@chakra-ui/icons";
import {
  Box,
  Flex,
  Heading,
  Icon,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Tag,
  useColorMode,
  SpaceProps
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { IoIosGitNetwork, IoIosPeople } from "react-icons/io";
import { FaRegCalendarCheck, FaRegCalendarTimes } from "react-icons/fa";
import tw, { css } from "twin.macro";
import { Link } from "features/common";
import { IOrg, OrgTypes } from "models/Org";
import { Category, getCategories, IEvent } from "models/Event";
import { breakpoints } from "theme/theme";

export const Header = ({
  defaultTitle,
  event,
  org,
  pageTitle,
  pageSubTitle,
  ...props
}: SpaceProps & {
  defaultTitle: string;
  org?: IOrg;
  event?: IEvent;
  pageTitle?: string;
  pageSubTitle?: React.ReactNode;
}) => {
  const banner = event?.eventBanner || org?.orgBanner;
  const logo = event?.eventLogo || org?.orgLogo;
  const router = useRouter();
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";

  //#region local state
  const icon =
    pageTitle === "Forum"
      ? ChatIcon
      : pageTitle === "Organisations"
      ? IoIosPeople
      : pageTitle === "Réseaux"
      ? IoIosGitNetwork
      : org
      ? org.orgType === OrgTypes.NETWORK
        ? IoIosGitNetwork
        : IoIosPeople
      : event
      ? event.isApproved
        ? FaRegCalendarCheck
        : FaRegCalendarTimes
      : null;

  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  const bgImage = banner ? `url("${banner.base64 || banner.url}")` : undefined;

  const logoBgImage = logo ? `url("${logo.url || logo.base64}")` : "";
  const logoBgSize = "110px";
  //#endregion

  const HeaderTitle = () => (
    <Flex
      alignItems="center"
      bg={banner ? "black" : isDark ? "whiteAlpha.400" : "blackAlpha.200"}
      borderRadius="lg"
      p={4}
      ml={logo ? 5 : undefined}
    >
      {icon && (
        <Icon
          as={icon}
          boxSize={8}
          color={
            event
              ? event.isApproved
                ? "green"
                : "red"
              : banner
              ? "white"
              : isDark
              ? "green.200"
              : "green"
          }
          mr={2}
          title={
            event?.isApproved
              ? "Événement approuvé"
              : event
              ? "Événement en attente de modération"
              : undefined
          }
        />
      )}

      <Flex
        alignItems="center"
        color={banner ? "white" : undefined}
        className={`rainbow-text ${banner ? "dark" : isDark ? "dark" : ""}`}
      >
        <Link href={router.asPath} variant="no-underline">
          <Heading fontFamily="DancingScript" size="lg">
            {org
              ? org.orgName
              : event
              ? event.eventName
              : pageTitle || defaultTitle}
          </Heading>
        </Link>
      </Flex>
    </Flex>
  );

  const HeaderEventCategory = () => {
    if (!event || !event.eventCategory) return null;
    const categories = getCategories(event);

    return (
      <Tag
        bgColor={
          categories[event.eventCategory].bgColor === "transparent"
            ? isDark
              ? "whiteAlpha.300"
              : "blackAlpha.600"
            : categories[event.eventCategory].bgColor
        }
        color={isDark ? "white" : "black"}
        ml={2}
      >
        {categories[event.eventCategory].label}
      </Tag>
    );
  };

  return (
    <Flex
      as="header"
      alignItems="center"
      bg={isDark ? "gray.700" : "lightblue"}
      borderRadius="lg"
      color={isDark ? "white" : "black"}
      cursor={banner ? "pointer" : "default"}
      height={banner ? banner.headerHeight : undefined}
      m={3}
      mb={0}
      p={
        banner && !logo
          ? "0 12px 0 12px"
          : banner && logo
          ? "0 12px 0 12px"
          : !banner && !logo
          ? 3
          : !banner && logo
          ? "10px 12px 0 12px"
          : undefined
      }
      css={css`
        background-image: ${bgImage};
        background-size: cover;
        background-repeat: no-repeat;
      `}
      onClick={(e) => {
        e.stopPropagation();
        setIsBannerModalOpen(true);
      }}
      {...props}
    >
      {logo && (
        <Link
          onClick={(e) => {
            e.stopPropagation();
            setIsLogoModalOpen(true);
          }}
        >
          <Image
            src={logo.url || logo.base64}
            borderTopRightRadius="lg"
            height={logoBgSize}
          />
        </Link>
      )}
      <HeaderTitle />
      <HeaderEventCategory />

      {banner &&
        (isBannerModalOpen ? (
          <Modal
            size="full"
            isOpen
            closeOnOverlayClick
            onClose={() => {
              setIsBannerModalOpen(false);
            }}
          >
            <ModalOverlay>
              <ModalContent bg="transparent" mt={0} minHeight="auto">
                <ModalHeader bg="blackAlpha.700" color="white">
                  Bannière de {org ? org.orgName : event ? event.eventName : ""}
                </ModalHeader>
                <ModalCloseButton color="white" />
                <ModalBody display="flex" flexDirection="column" p={0}>
                  <Image
                    alignSelf="center"
                    src={banner.url || banner.base64}
                    height={banner.height || 140}
                    width={banner.width || 1154}
                  />
                </ModalBody>
              </ModalContent>
            </ModalOverlay>
          </Modal>
        ) : (
          logo &&
          isLogoModalOpen && (
            <Modal
              size="full"
              isOpen
              closeOnOverlayClick
              onClose={() => {
                setIsLogoModalOpen(false);
              }}
            >
              <ModalOverlay>
                <ModalContent bg="transparent" mt={0} minHeight="auto">
                  <ModalHeader bg="blackAlpha.700" color="white">
                    Logo de {org ? org.orgName : event ? event.eventName : ""}
                  </ModalHeader>
                  <ModalCloseButton color="white" />
                  <ModalBody display="flex" flexDirection="column" p={0}>
                    <Box
                      alignSelf="center"
                      bg={logoBgImage}
                      bgRepeat="no-repeat"
                      height={logo.height}
                      width={logo.width}
                    ></Box>
                  </ModalBody>
                </ModalContent>
              </ModalOverlay>
            </Modal>
          )
        ))}
    </Flex>
  );
};

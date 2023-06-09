import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import {
  Box,
  Flex,
  Icon,
  IconButton,
  Spinner,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Tooltip,
  useColorMode
} from "@chakra-ui/react";
import React, { useMemo, useState } from "react";
import { FaGlobeEurope, FaMapMarkedAlt, FaTree } from "react-icons/fa";
import { css } from "twin.macro";
import { EntityButton } from "features/common";
import { scrollbarCss, tableCss } from "features/layout/theme";
import { MapModal } from "features/modals/MapModal";
import { SubscribePopover } from "features/subscriptions/SubscribePopover";
import {
  EOrgType,
  IOrg,
  orgTypeFull,
  orgTypeFull5,
  OrgTypes
} from "models/Org";
import { ISubscription } from "models/Subscription";
import { IUser } from "models/User";
import { AppQuery } from "utils/types";

const defaultKeys = (orgType: EOrgType) => [
  {
    key: "subscription",
    label: ""
  },
  {
    key: "orgName",
    label: `Nom de ${orgTypeFull(orgType)}`
  },
  // { key: "orgType", label: "Type" },
  // { key: "orgCity", label: "Position" },
  {
    key: "createdBy",
    label: "Créé par"
  }
];

export const OrgsList = ({
  isMobile,
  query,
  subQuery,
  orgType = EOrgType.NETWORK,
  ...props
}: {
  keys?: (orgType: EOrgType) => {
    key: string;
    label: string;
  }[];
  isMobile?: boolean;
  query: AppQuery<IOrg | IOrg[]>;
  subQuery?: AppQuery<ISubscription>;
  orgType?: EOrgType;
}) => {
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";
  const [orgToShow, setOrgToShow] = useState<IOrg | void>();

  let { data, isLoading } = query;
  if (!Array.isArray(data)) data = data?.orgs;

  const [selectedOrder, s] = useState<{ key: string; order: "asc" | "desc" }>();
  const setSelectedOrder = (key: string) => {
    const order = !selectedOrder
      ? "asc"
      : selectedOrder?.key === key && selectedOrder?.order === "asc"
      ? "desc"
      : "asc";
    s({ key, order });
  };

  const orgs = useMemo(
    () =>
      Array.isArray(data)
        ? [...data].sort((a, b) => {
            const key = selectedOrder?.key || "orgName";
            const order = selectedOrder?.order || "asc";

            let valueA = a[key as keyof IOrg];
            if (typeof valueA === "string") valueA = valueA.toLowerCase();
            else valueA = (valueA as IUser).userName.toLowerCase();

            let valueB = b[key as keyof IOrg];
            if (typeof valueB === "string") valueB = valueB.toLowerCase();
            else valueB = (valueB as IUser).userName.toLowerCase();

            if (order === "asc") {
              if (valueA < valueB) return -1;
              if (valueA > valueB) return 1;
            } else if (order === "desc") {
              if (valueA > valueB) return -1;
              if (valueA < valueB) return 1;
            }

            return 0;
          })
        : [],
    [data, selectedOrder]
  );

  const iconProps = {
    boxSize: 6
  };

  const keys = props.keys ? props.keys(orgType) : defaultKeys(orgType);

  return (
    <Box
      overflowX="auto"
      css={css`
        ${scrollbarCss}
      `}
    >
      <Table css={css(tableCss(isMobile))}>
        <Thead>
          <Tr>
            {keys.map(({ key, label }) => {
              return (
                <Th
                  color={isDark ? "white" : "black"}
                  key={key}
                  cursor="pointer"
                  onClick={() => setSelectedOrder(key)}
                >
                  <Flex alignItems="center">
                    {label}

                    {selectedOrder ? (
                      selectedOrder.key === key ? (
                        selectedOrder.order === "desc" ? (
                          <ChevronUpIcon {...iconProps} />
                        ) : (
                          <ChevronDownIcon {...iconProps} />
                        )
                      ) : (
                        ""
                      )
                    ) : key === "orgName" ? (
                      <ChevronDownIcon {...iconProps} />
                    ) : (
                      ""
                    )}
                  </Flex>
                </Th>
              );
            })}
          </Tr>
        </Thead>

        <Tbody>
          {isLoading ? (
            <Tr>
              <Td colSpan={4}>
                <Spinner />
              </Td>
            </Tr>
          ) : (
            orgs.map((org: IOrg) => {
              if (org.orgUrl === "forum") return;
              return (
                <Tr key={`org-${org._id}`}>
                  {keys.find(({ key }) => key === "icon") && (
                    <Td p={isMobile ? 0 : undefined}>
                      <Icon
                        as={
                          org.orgType === EOrgType.NETWORK
                            ? FaGlobeEurope
                            : FaTree
                        }
                        color={
                          org.orgType === EOrgType.NETWORK
                            ? "blue.500"
                            : "green.500"
                        }
                      />
                    </Td>
                  )}

                  {keys.find(({ key }) => key === "subscription") &&
                    subQuery && (
                      <Td p={isMobile ? 0 : undefined}>
                        <SubscribePopover
                          org={org}
                          query={query}
                          subQuery={subQuery}
                          isIconOnly
                          my={isMobile ? 2 : 0}
                          mr={isMobile ? 2 : 0}
                        />
                      </Td>
                    )}

                  {keys.find(({ key }) => key === "orgName") && (
                    <Td>
                      {/* {org.orgType === EOrgType.TREETOOLS
                        ? OrgTypes[org.orgType] + " : "
                        : ""}
                      <Tooltip
                        hasArrow
                        label={`Visiter ${orgTypeFull5(org.orgType)}`}
                        placement="top"
                      >
                        <span>
                          <Link
                            variant="underline"
                            href={`/${org.orgUrl}`}
                            shallow
                          >
                            {org.orgName}
                          </Link>
                        </span>
                      </Tooltip> */}
                      <EntityButton org={org} />

                      {org.orgCity && (
                        <Tooltip label="Afficher sur la carte" placement="top">
                          <IconButton
                            aria-label="Afficher sur la carte"
                            icon={<FaMapMarkedAlt />}
                            ml={2}
                            my={isMobile ? 2 : 0}
                            onClick={() => setOrgToShow(org)}
                          />
                        </Tooltip>
                      )}
                    </Td>
                  )}

                  {keys.find(({ key }) => key === "createdBy") && (
                    <Td>
                      <EntityButton
                        user={{ userName: (org.createdBy as IUser).userName }}
                        tooltipProps={{ placement: "top" }}
                      />
                    </Td>
                  )}
                </Tr>
              );
            })
          )}
        </Tbody>
      </Table>

      {orgToShow && (
        <MapModal
          header={
            <>
              <Icon as={FaGlobeEurope} color="blue" mr={2} />{" "}
              {orgToShow.orgName}
            </>
          }
          isOpen
          isSearch={false}
          orgs={[orgToShow]}
          center={{
            lat: orgToShow.orgLat,
            lng: orgToShow.orgLng
          }}
          zoomLevel={16}
          onClose={() => setOrgToShow()}
        />
      )}
    </Box>
  );
};

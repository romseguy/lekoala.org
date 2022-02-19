import { ChevronDownIcon, ChevronRightIcon, EditIcon } from "@chakra-ui/icons";
import {
  Button,
  Flex,
  Grid,
  GridProps,
  Heading,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Tooltip,
  useToast
} from "@chakra-ui/react";
import { Session } from "next-auth";
import React, { useEffect, useState } from "react";
import { FaFolder, FaFolderOpen } from "react-icons/fa";
import { css } from "twin.macro";
import { DeleteButton, GridHeader, GridItem, Link } from "features/common";
import { EntityListForm } from "features/forms/EntityListForm";
import {
  addOrReplaceList,
  editList,
  getLists,
  IOrg,
  IOrgList
} from "models/Org";
import { breakpoints } from "theme/theme";
import { hasItems } from "utils/array";
import { AppQuery } from "utils/types";
import { OrgConfigVisibility } from "./OrgConfigPanel";
import { EditOrgPayload, useEditOrgMutation } from "./orgsApi";

export const OrgConfigListsPanel = ({
  orgQuery,
  isVisible,
  setIsVisible,
  session
}: GridProps &
  OrgConfigVisibility & {
    orgQuery: AppQuery<IOrg>;
    session: Session;
  }) => {
  const toast = useToast({ position: "top" });

  //#region org
  const org = orgQuery.data;
  const [editOrg] = useEditOrgMutation();
  //#endregion

  //#region local state
  const lists = getLists(org);
  const [isAdd, setIsAdd] = useState(false);
  const [listToEdit, setListToEdit] = useState<IOrgList>();
  const [listToShow, setListToShow] = useState<IOrgList>();
  useEffect(() => {
    if (!hasItems(lists)) setIsVisible({ ...isVisible, lists: false });
  }, [lists]);
  //#endregion

  const onSubmit = async (form: IOrgList) => {
    try {
      let payload: EditOrgPayload = {};

      if (listToEdit && listToEdit.listName !== form.listName) {
        for (const orgList of org.orgLists || [])
          if (orgList.listName === form.listName)
            throw { listName: "Ce nom n'est pas disponible." };

        payload.orgLists = editList(org, listToEdit, form);
      } else payload.orgLists = addOrReplaceList(org, form);

      await editOrg({
        payload,
        orgUrl: org.orgUrl
      }).unwrap();
      orgQuery.refetch();
      setIsAdd(false);
      setIsVisible({ ...isVisible, lists: true });

      if (listToEdit)
        toast({ status: "success", title: "La liste a bien été modifiée !" });
      else toast({ status: "success", title: "La liste a bien été ajoutée !" });
    } catch (error) {
      if (listToEdit)
        toast({ status: "error", title: "La liste n'a pas pu être modifiée" });
      else
        toast({ status: "error", title: "La liste n'a pas pu être ajoutée" });

      throw error;
    }
  };

  return (
    <Grid>
      <Link
        variant="no-underline"
        onClick={() => {
          if (!hasItems(lists)) setIsAdd(!isAdd);
          setIsVisible({
            banner: false,
            lists: hasItems(lists) ? !isVisible.lists : false,
            logo: false,
            subscribers: false
          });
        }}
      >
        <GridHeader
          borderTopRadius="lg"
          borderBottomRadius={!isVisible.lists && !isAdd ? "lg" : undefined}
        >
          <Grid templateColumns="1fr auto" alignItems="center">
            <GridItem
              css={css`
                @media (max-width: ${breakpoints.nav}) {
                  & {
                    padding-top: 12px;
                    padding-bottom: 12px;
                  }
                }
              `}
            >
              <Flex alignItems="center">
                {hasItems(lists) &&
                  (isVisible.lists ? <FaFolderOpen /> : <FaFolder />)}
                <Heading size="sm" ml={2}>
                  {lists
                    ? `${lists.length} liste${lists.length !== 1 ? "s" : ""}`
                    : "0 listes"}
                </Heading>
              </Flex>
            </GridItem>

            <GridItem
              css={css`
                @media (max-width: ${breakpoints.nav}) {
                  & {
                    grid-column: 1;
                    padding-bottom: 12px;
                  }
                }
              `}
            >
              <Button
                rightIcon={isAdd ? <ChevronDownIcon /> : <ChevronRightIcon />}
                colorScheme={isAdd ? "green" : "teal"}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAdd(!isAdd);
                  setIsVisible({ ...isVisible, lists: false });
                }}
                m={1}
                data-cy="org-list-add"
              >
                Ajouter
              </Button>
            </GridItem>
          </Grid>
        </GridHeader>
      </Link>

      {isAdd && (
        <GridItem light={{ bg: "orange.50" }} dark={{ bg: "gray.500" }} p={5}>
          <EntityListForm
            org={org}
            onCancel={() => {
              setIsAdd(false);
            }}
            onSubmit={onSubmit}
          />
        </GridItem>
      )}

      {isVisible.lists &&
        (orgQuery.isLoading ? (
          <Text>Chargement des listes...</Text>
        ) : hasItems(lists) ? (
          <GridItem
            light={{ bg: "orange.100" }}
            dark={{ bg: "gray.500" }}
            overflowX="auto"
            aria-hidden
          >
            {session.user.isAdmin && (
              <Button
                onClick={async () => {
                  await editOrg({
                    orgUrl: org.orgUrl,
                    payload: { orgLists: [] }
                  }).unwrap();

                  orgQuery.refetch();
                }}
              >
                RAZ
              </Button>
            )}

            <Table
              css={css`
                @media (max-width: 700px) {
                  td {
                    padding: 6px;
                  }
                }
              `}
            >
              <Thead>
                <Tr>
                  <Th>Nom</Th>
                  <Th></Th>
                  <Th></Th>
                </Tr>
              </Thead>

              <Tbody>
                {lists?.map((list, index) => {
                  const { listName, subscriptions } = list;
                  const hasSubscriptions =
                    subscriptions && subscriptions.length > 0;
                  const s =
                    subscriptions &&
                    (subscriptions.length > 1 || !subscriptions.length)
                      ? "s"
                      : "";

                  return (
                    <Tr key={`list-${index}`}>
                      <Td>{listName}</Td>

                      <Td whiteSpace="nowrap">
                        <Link
                          cursor={hasSubscriptions ? "pointer" : "default"}
                          variant={
                            hasSubscriptions ? "underline" : "no-underline"
                          }
                          onClick={() => {
                            if (hasSubscriptions) setListToShow(list);
                          }}
                          data-cy="org-list-link"
                        >
                          {hasSubscriptions ? subscriptions.length : 0} membre
                          {hasSubscriptions ? s : "s"}
                        </Link>
                      </Td>

                      <Td textAlign="right" whiteSpace="nowrap">
                        {!["Abonnés", "Adhérents"].includes(list.listName) && (
                          <>
                            <Tooltip
                              label="Modifier la liste"
                              hasArrow
                              placement="top"
                            >
                              <IconButton
                                aria-label="Modifier la liste"
                                bg="transparent"
                                _hover={{ bg: "transparent", color: "green" }}
                                icon={<EditIcon />}
                                height="auto"
                                minWidth={0}
                                mr={3}
                                onClick={async () => {
                                  setListToEdit(list);
                                }}
                                data-cy={`org-list-${listName}-edit`}
                              />
                            </Tooltip>

                            <DeleteButton
                              header={
                                <>
                                  Êtes vous sûr de vouloir supprimer la liste{" "}
                                  <Text
                                    display="inline"
                                    color="red"
                                    fontWeight="bold"
                                  >
                                    {listName}
                                  </Text>{" "}
                                  ?
                                </>
                              }
                              isIconOnly
                              onClick={async () => {
                                await editOrg({
                                  payload: [`orgLists.listName=${listName}`],
                                  orgUrl: org.orgUrl
                                });
                                orgQuery.refetch();
                              }}
                              hasArrow
                              label="Supprimer la liste"
                              placement="top"
                              data-cy={`org-list-${listName}-remove`}
                            />
                          </>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>

            {(listToEdit || listToShow) && (
              <Modal
                isOpen
                onClose={() => {
                  setListToEdit(undefined);
                  setListToShow(undefined);
                }}
              >
                <ModalOverlay />
                <ModalContent maxWidth={listToEdit && "xl"}>
                  <ModalHeader>
                    {listToEdit && `Modifier la liste : ${listToEdit.listName}`}
                    {listToShow && `Liste : ${listToShow.listName}`}
                  </ModalHeader>
                  <ModalCloseButton />
                  <ModalBody>
                    {listToEdit && (
                      <EntityListForm
                        list={listToEdit}
                        org={org}
                        onCancel={() => setListToEdit(undefined)}
                        onSubmit={async (payload) => {
                          await onSubmit(payload);
                          setListToEdit(undefined);
                        }}
                      />
                    )}

                    {listToShow && listToShow.subscriptions && (
                      <Table>
                        <Tbody>
                          {listToShow.subscriptions.map((subscription) => {
                            const label =
                              subscription.email ||
                              subscription.phone ||
                              (typeof subscription.user === "object"
                                ? subscription.user.email
                                : "");

                            return (
                              <Tr key={subscription._id}>
                                <Td>{label}</Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    )}
                  </ModalBody>
                </ModalContent>
              </Modal>
            )}
          </GridItem>
        ) : (
          <Text>Aucune liste de diffusion.</Text>
        ))}
    </Grid>
  );
};

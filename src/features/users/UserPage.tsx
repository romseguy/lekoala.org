import { ArrowBackIcon, EditIcon } from "@chakra-ui/icons";
import {
  Flex,
  Box,
  Button,
  useToast,
  Grid,
  Heading,
  Icon,
  IconButton,
  Textarea,
  VStack,
  TabPanel,
  TabPanels,
  Spinner,
  Tooltip
} from "@chakra-ui/react";
import { format } from "date-fns";
import { Session, User } from "next-auth";
import { useRouter } from "next/router";
import React, { useState } from "react";
import tw, { css } from "twin.macro";

import {
  GridHeader,
  GridItem,
  IconFooter,
  Link,
  RTEditor
} from "features/common";
import { UserForm } from "features/forms/UserForm";
import { Layout } from "features/layout";
import { ProjectsList } from "features/projects/ProjectsList";
import { useSession } from "hooks/useAuth";
import { IUser } from "models/User";
import { useAppDispatch } from "store";
import api from "utils/api";
import { UserPageTabs } from "./UserPageTabs";
import { useGetUserQuery, useEditUserMutation } from "./usersApi";

export const UserPage = ({
  ...props
}: {
  user: IUser;
  session: Session | null;
}) => {
  const router = useRouter();
  const { data: clientSession } = useSession();
  const session = clientSession || props.session;
  const isSelf = props.user._id === session?.user.userId;
  const toast = useToast({ position: "top" });
  const dispatch = useAppDispatch();

  const userQuery = useGetUserQuery({
    slug: props.user.userName || props.user._id,
    populate: isSelf ? "userProjects" : undefined
  });

  const [editUser, editUserMutation] = useEditUserMutation();

  const user: Partial<IUser> = isSelf
    ? {
        ...props.user,
        _id: session?.user.userId,
        email: session?.user.email,
        userName: session?.user.userName,
        userImage: session?.user.userImage,
        isAdmin: session?.user.isAdmin
      }
    : props.user;

  const [data, setData] = useState<any>();
  const [isEdit, setIsEdit] = useState(false);
  const [isDescriptionEdit, setIsDescriptionEdit] = useState(false);
  const [isLogin, setIsLogin] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState<string | undefined>();

  return (
    <Layout pageTitle={user.userName} session={session}>
      <>
        {(isSelf || session?.user.isAdmin) && (
          <>
            {!isEdit ? (
              <Button
                colorScheme="teal"
                leftIcon={<Icon as={isEdit ? ArrowBackIcon : EditIcon} />}
                onClick={() => setIsEdit(!isEdit)}
                mb={5}
                data-cy="userEdit"
              >
                Paramètres de votre compte
              </Button>
            ) : (
              <Button
                colorScheme="pink"
                leftIcon={<Icon as={isEdit ? ArrowBackIcon : EditIcon} />}
                mb={5}
                onClick={() => setIsEdit(!isEdit)}
                data-cy="userEdit"
              >
                Revenir à votre page
              </Button>
            )}
          </>
        )}

        {isEdit && (
          <UserForm
            user={user}
            onSubmit={async ({ userName }) => {
              setIsEdit(false);
              toast({
                title: "Votre profil a bien été modifié !",
                status: "success",
                isClosable: true
              });

              if (userName && userName !== user.userName) {
                await router.push(`/${userName}`);
              }
            }}
          />
        )}

        {!isEdit && isSelf && (
          <UserPageTabs>
            <TabPanels>
              <TabPanel aria-hidden>
                <Grid
                  gridGap={5}
                  css={css`
                    @media (max-width: 650px) {
                      & {
                        grid-template-columns: 1fr !important;
                      }
                    }
                  `}
                >
                  {/* <GridItem
                  light={{ bg: "orange.100" }}
                  dark={{ bg: "gray.500" }}
                  borderTopRadius="lg"
                >
                  <Grid templateRows="auto 1fr">
                    <GridHeader
                      display="flex"
                      alignItems="center"
                      borderTopRadius="lg"
                    >
                      <Heading size="sm" py={3}>
                        Présentation
                      </Heading>
                      {isSelf && (
                        <Tooltip
                          placement="bottom"
                          label={
                            userQuery.data?.userDescription
                              ? "Modifier la présentation"
                              : "Ajouter une présentation"
                          }
                        >
                          <IconButton
                            aria-label={
                              userQuery.data?.userDescription
                                ? "Modifier la présentation"
                                : "Ajouter une présentation"
                            }
                            icon={<EditIcon />}
                            bg="transparent"
                            _hover={{ color: "green" }}
                            onClick={() => {
                              setIsDescriptionEdit(true);
                            }}
                          />
                        </Tooltip>
                      )}
                    </GridHeader>

                    <GridItem
                      light={{ bg: "orange.100" }}
                      dark={{ bg: "gray.500" }}
                    >
                      <Box p={5}>
                        {isDescriptionEdit ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              setIsLoading(true);
                              try {
                                await editUser({
                                  payload: { userDescription: description },
                                  userName: session?.user.userId
                                }).unwrap();
                                userQuery.refetch();
                                toast({
                                  title:
                                    "Votre présentation a bien été enregistrée",
                                  status: "success",
                                  isClosable: true
                                });
                              } catch (error) {
                                toast({
                                  title:
                                    "Votre présentation n'a pas pu être enregistrée.",
                                  status: "error",
                                  isClosable: true
                                });
                              } finally {
                                setIsLoading(false);
                              }
                            }}
                          >
                            <RTEditor
                              session={session}
                              defaultValue={userQuery.data?.userDescription}
                              placeholder="Ajoutez ici votre présentation"
                              onChange={({ quillHtml }) => {
                                setDescription(quillHtml);
                              }}
                            />

                            <Flex justifyContent="space-between" mt={5}>
                              <Button
                                onClick={() => setIsDescriptionEdit(false)}
                              >
                                Annuler
                              </Button>

                              <Button
                                colorScheme="green"
                                type="submit"
                                isLoading={isLoading}
                              >
                                {userQuery.data?.userDescription
                                  ? "Modifier"
                                  : "Ajouter"}
                              </Button>
                            </Flex>
                          </form>
                        ) : (
                          <>
                            {userQuery.data?.userDescription ? (
                              userQuery.data.userDescription
                            ) : isSelf ? (
                              <Link
                                variant="underline"
                                onClick={() => setIsDescriptionEdit(true)}
                              >
                                Cliquez ici pour ajouter une présentation
                              </Link>
                            ) : (
                              "Aucune présentation."
                            )}
                          </>
                        )}
                      </Box>
                    </GridItem>
                  </Grid>
                </GridItem> */}

                  {isSelf && session?.user.isAdmin && !isEdit && (
                    <GridItem
                      light={{ bg: "orange.100" }}
                      dark={{ bg: "gray.500" }}
                      borderTopRadius="lg"
                    >
                      <Grid templateRows="auto 1fr">
                        <GridHeader borderTopRadius="lg" alignItems="center">
                          <Heading size="sm" py={3}>
                            Administration
                          </Heading>
                        </GridHeader>
                        <GridItem>
                          <VStack spacing={5} p={5}>
                            <Button onClick={() => router.push("/sandbox")}>
                              Sandbox
                            </Button>

                            <Button
                              onClick={async () => {
                                try {
                                  const { data } = await api.get(
                                    "admin/backup"
                                  );
                                  const a = document.createElement("a");
                                  const href = window.URL.createObjectURL(
                                    new Blob([JSON.stringify(data)], {
                                      type: "application/json"
                                    })
                                  );
                                  a.href = href;
                                  a.download =
                                    "data-" + format(new Date(), "dd-MM-yyyy");
                                  a.click();
                                  window.URL.revokeObjectURL(href);
                                } catch (error: any) {
                                  console.error(error);
                                  toast({
                                    status: "error",
                                    title: error
                                  });
                                }
                              }}
                            >
                              Exporter les données
                            </Button>

                            <Textarea
                              onChange={(e) => setData(e.target.value)}
                              placeholder="Copiez ici les données exportées précédemment"
                            />
                            <Button
                              isDisabled={!data}
                              onClick={async () => {
                                try {
                                  await api.post("admin/backup", data);
                                  toast({
                                    status: "success",
                                    title: "Les données ont été importées"
                                  });
                                } catch (error) {
                                  console.error(error);
                                  toast({
                                    status: "error",
                                    title: error.message
                                  });
                                }
                              }}
                            >
                              Importer les données
                            </Button>
                          </VStack>
                        </GridItem>
                      </Grid>
                    </GridItem>
                  )}
                </Grid>
              </TabPanel>
              <TabPanel aria-hidden>
                <ProjectsList
                  user={userQuery.data}
                  userQuery={userQuery}
                  isLogin={isLogin}
                  setIsLogin={setIsLogin}
                />
                <IconFooter />
              </TabPanel>
              <TabPanel aria-hidden>Bientôt</TabPanel>
            </TabPanels>
          </UserPageTabs>
        )}
      </>
    </Layout>
  );
};

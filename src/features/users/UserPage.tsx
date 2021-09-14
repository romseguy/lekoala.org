import { useRouter } from "next/router";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import tw, { css } from "twin.macro";
import { ArrowBackIcon, EditIcon } from "@chakra-ui/icons";
import {
  Flex,
  Box,
  Button,
  useToast,
  Icon,
  Textarea,
  Alert,
  AlertIcon,
  VStack
} from "@chakra-ui/react";
import { useSession } from "hooks/useAuth";
import api from "utils/api";
import type { IUser } from "models/User";
import { Layout } from "features/layout";
import { UserForm } from "features/forms/UserForm";
import { useGetUserQuery } from "features/users/usersApi";
import { selectUserEmail, selectUserImage, selectUserName } from "./userSlice";

export const User = ({
  routeName,
  ...props
}: {
  user: IUser;
  routeName: string;
}) => {
  const router = useRouter();
  const { data: session, loading: isSessionLoading } =
    useSession(/* {
    required: true,
    action() {
      router.push("/?login");
    }
  } */);
  const [data, setData] = useState<any>();

  const query = useGetUserQuery(routeName);
  const user = query.data || props.user;

  const storedUserEmail = useSelector(selectUserEmail);
  const storedUserImage = useSelector(selectUserImage);
  const storedUserName = useSelector(selectUserName);

  const [isEdit, setIsEdit] = useState(false);
  const toast = useToast({ position: "top" });

  return (
    <Layout pageTitle={user.userName} {...props}>
      <>
        <Flex mb={5} flexDirection="column">
          {user.email === session?.user.email && (
            <>
              <Box>
                <Button
                  aria-label="Modifier"
                  leftIcon={<Icon as={isEdit ? ArrowBackIcon : EditIcon} />}
                  mr={3}
                  onClick={() => setIsEdit(!isEdit)}
                  css={css`
                    &:hover {
                      ${tw`bg-green-300`}
                    }
                  `}
                  data-cy="userEdit"
                >
                  {isEdit ? "Retour" : "Modifier"}
                </Button>
              </Box>
              {session?.user.isAdmin && (
                <VStack spacing={5}>
                  <Alert mt={3} status="info">
                    <AlertIcon />
                    Vous êtes administrateur.
                  </Alert>

                  <Button onClick={() => router.push("/sandbox")}>
                    Sandbox
                  </Button>

                  <Button
                    onClick={async () => {
                      const { error, data } = await api.get("admin/backup");
                      const a = document.createElement("a");
                      const href = window.URL.createObjectURL(
                        new Blob([JSON.stringify(data)], {
                          type: "application/json"
                        })
                      );
                      a.href = href;
                      a.download = "data-" + format(new Date(), "dd-MM-yyyy");
                      a.click();
                      window.URL.revokeObjectURL(href);
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
                      const query = await api.post("admin/backup", data);

                      if (query.error) {
                        toast({ status: "error", title: query.error.message });
                      } else {
                        toast({
                          status: "success",
                          title: "Les données ont été importées"
                        });
                      }
                    }}
                  >
                    Importer les données
                  </Button>
                </VStack>
              )}
            </>
          )}
        </Flex>

        {isEdit && (
          <UserForm
            user={{
              ...user,
              email: storedUserEmail || user.email,
              userImage: storedUserImage || user.userImage,
              userName: storedUserName || user.userName
            }}
            onSubmit={async ({ userName, email }) => {
              let title;

              if (
                email !== props.user.email &&
                userName !== props.user.userName
              ) {
                title = "Votre page a bien été modifiée !";
              }
              if (email !== props.user.email) {
                title = "Votre e-mail a bien été modifié !";
              } else if (userName !== props.user.userName) {
                title = "Votre nom d'utilisateur a bien été modifié !";
                await router.push(`/${userName}`);
              }

              if (title)
                toast({
                  title,
                  status: "success",
                  isClosable: true
                });

              setIsEdit(false);
            }}
          />
        )}
      </>
    </Layout>
  );
};

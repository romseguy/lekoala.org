import { ArrowBackIcon, EditIcon, Icon } from "@chakra-ui/icons";
import {
  Alert,
  AlertIcon,
  Box,
  Flex,
  Input,
  Text,
  useToast
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { useDeleteOrgMutation } from "features/api/orgsApi";
import { Button, DeleteButton } from "features/common";
import { EOrgType, IOrg, orgTypeFull, orgTypeFull5 } from "models/Org";
import { AppQueryWithData } from "utils/types";
import { OrgConfigVisibility } from "./OrgConfigPanel";
import { IsEditConfig } from "./OrgPage";

export const OrgConfigButtons = ({
  isEdit,
  isMobile,
  orgQuery,
  setIsEdit,
  toggleVisibility
}: OrgConfigVisibility & {
  isEdit: boolean;
  isMobile: boolean;
  orgQuery: AppQueryWithData<IOrg>;
  setIsEdit: (arg: boolean | IsEditConfig) => void;
}) => {
  const org = orgQuery.data;
  const [deleteOrg, deleteQuery] = useDeleteOrgMutation();
  const router = useRouter();
  const toast = useToast({ position: "top" });
  const [isDisabled, setIsDisabled] = useState(true);

  return (
    <Flex flexDirection={isMobile ? "column" : "row"}>
      <Flex mb={isMobile ? 3 : 3}>
        <Button
          colorScheme="teal"
          leftIcon={<Icon as={isEdit ? ArrowBackIcon : EditIcon} />}
          mr={3}
          onClick={() => {
            setIsEdit(true);
            toggleVisibility();
          }}
          data-cy="orgEdit"
        >
          Modifier
        </Button>
      </Flex>

      <Flex mb={isMobile ? 3 : 0}>
        <DeleteButton
          isDisabled={isDisabled}
          isLoading={deleteQuery.isLoading}
          label={`${
            org.orgType === EOrgType.NETWORK ? "Supprimer" : "Déraciner"
          } ${orgTypeFull5(org.orgType)}`}
          header={
            <>
              Vous êtes sur le point de{" "}
              {org.orgType === EOrgType.NETWORK
                ? "supprimer la planète"
                : "déraciner l'arbre"}{" "}
              <Text display="inline" color="red" fontWeight="bold">
                {` ${org.orgName}`}
              </Text>
            </>
          }
          body={
            <>
              <Alert status="warning">
                <AlertIcon />
                <Box>
                  Toutes les données associées à {orgTypeFull5(org.orgType)}{" "}
                  seront supprimées. Cette action est{" "}
                  <strong>irréversible</strong> !
                </Box>
              </Alert>
              <Text mb={1} mt={3}>
                <strong>Confirmez</strong> en saisissant le nom{" "}
                {orgTypeFull(org.orgType)} :
              </Text>
              <Input
                autoComplete="off"
                onChange={(e) =>
                  setIsDisabled(
                    e.target.value.toLowerCase() !== org.orgName.toLowerCase()
                  )
                }
              />
            </>
          }
          onClick={async () => {
            try {
              const deletedOrg = await deleteOrg(org._id).unwrap();

              if (deletedOrg) {
                await router.push(`/`);
                toast({
                  title: `${orgTypeFull5(deletedOrg.orgType, true)} ${
                    deletedOrg.orgName
                  } a été ${
                    deletedOrg.orgType === EOrgType.NETWORK
                      ? "détruite"
                      : "déraciné"
                  } !`,
                  status: "success"
                });
              }
            } catch (error: any) {
              toast({
                title: error.data ? error.data.message : error.message,
                status: "error"
              });
            }
          }}
        />
      </Flex>
    </Flex>
  );
};
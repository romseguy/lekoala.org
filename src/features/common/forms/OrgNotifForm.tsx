import { HamburgerIcon, EmailIcon } from "@chakra-ui/icons";
import {
  RadioGroup,
  Stack,
  Radio,
  Spinner,
  FormControl,
  CheckboxGroup,
  Table,
  Tbody,
  Tr,
  Td,
  Flex,
  Checkbox,
  FormErrorMessage,
  Box,
  useColorMode,
  Heading,
  Alert,
  AlertIcon
} from "@chakra-ui/react";
import { ErrorMessage } from "@hookform/error-message";
import React, { Fragment, useState } from "react";
import { useForm } from "react-hook-form";
import { IEvent } from "models/Event";
import { orgTypeFull, getSubscriptions, IOrg } from "models/Org";
import { SubscriptionTypes } from "models/Subscription";
import { ITopic } from "models/Topic";
import { hasItems } from "utils/array";
import { EmailControl, EntityButton, Button, ErrorMessageText } from "..";
import { isTopic } from "utils/models";
import { equalsValue } from "utils/string";

export const OrgNotifForm = ({
  entity,
  org,
  query,
  onCancel,
  onSubmit
}: {
  entity: IEvent<string | Date> | ITopic;
  org: IOrg;
  query: any;
  onCancel?: () => void;
  onSubmit: (
    form: { email?: string; orgListsNames?: string[] },
    type?: "single" | "multi"
  ) => Promise<void>;
}) => {
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";

  const {
    control,
    register,
    handleSubmit,
    errors,
    setError,
    clearErrors,
    watch,
    setValue,
    getValues,
    trigger
  } = useForm({
    mode: "onChange"
  });
  const email = watch("email");
  const orgListsNames = watch("orgListsNames");
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<"multi" | "single" | undefined>();
  const isT = isTopic(entity);

  return (
    <Box
      bg={isDark ? "gray.500" : "orange.100"}
      borderRadius="lg"
      pb={3}
      pt={1}
      px={3}
      mb={3}
      mt={1}
    >
      <form
        onSubmit={handleSubmit(async (form: { orgListsNames: string[] }) => {
          setIsLoading(true);
          await onSubmit(form, type);
          setIsLoading(false);
        })}
      >
        <RadioGroup name="type" cursor="pointer" my={3}>
          <Stack spacing={2}>
            <Radio
              isChecked={type === "multi"}
              onChange={() => {
                setType("multi");
              }}
            >
              Envoyer {isT ? "la notification" : "l'invitation"} à une ou
              plusieurs listes de diffusion
            </Radio>
            <Radio
              isChecked={type === "single"}
              onChange={() => {
                setType("single");
              }}
            >
              Envoyer {isT ? "la notification" : "l'invitation"} à une seule
              adresse e-mail
            </Radio>
          </Stack>
        </RadioGroup>

        {query.isLoading && <Spinner />}

        {type === "single" && !query.isLoading && (
          <EmailControl
            name="email"
            noLabel
            control={control}
            register={register}
            setValue={setValue}
            errors={errors}
            placeholder="Envoyer à cette adresse e-mail uniquement"
            isMultiple={false}
          />
        )}

        {type === "multi" && !query.isLoading && (
          <FormControl isInvalid={!!errors.orgListsNames} isRequired>
            <CheckboxGroup>
              <Table>
                <Tbody>
                  <Fragment key={org._id}>
                    <Tr>
                      <Td pl={0} pt={0} colSpan={2}>
                        <Flex alignItems="center">
                          <HamburgerIcon mr={2} />
                          <Heading display="flex" alignItems="center" size="sm">
                            Listes de diffusion {orgTypeFull(org.orgType)}
                            <EntityButton
                              org={org}
                              pl={1}
                              pr={2}
                              py={1}
                              ml={2}
                            />
                          </Heading>
                        </Flex>
                      </Td>
                    </Tr>

                    {(org.orgLists || [])
                      .concat([
                        {
                          listName: "Abonnés",
                          subscriptions: getSubscriptions(
                            org,
                            SubscriptionTypes.FOLLOWER
                          )
                        },
                        {
                          listName: "Adhérents",
                          subscriptions: getSubscriptions(
                            org,
                            SubscriptionTypes.SUBSCRIBER
                          )
                        }
                      ])
                      .map((list) => {
                        let i = 0;
                        for (const subscription of list.subscriptions) {
                          const notified = isT
                            ? entity.topicNotified
                            : entity.eventNotified;

                          if (
                            notified?.find(({ email, phone }) =>
                              typeof subscription.user === "object"
                                ? equalsValue(subscription.user.email, email) ||
                                  equalsValue(subscription.user.phone, phone)
                                : equalsValue(email, subscription.email) ||
                                  equalsValue(phone, subscription.phone)
                            )
                          )
                            continue;

                          i++;
                        }
                        const s = i !== 1 ? "s" : "";

                        return (
                          <Tr key={list.listName}>
                            <Td>
                              <Checkbox
                                name="orgListsNames"
                                ref={register({
                                  required:
                                    "Veuillez sélectionner une liste au minimum"
                                })}
                                value={list.listName + "." + org._id}
                                icon={<EmailIcon />}
                                isDisabled={i === 0}
                              >
                                {list.listName}
                              </Checkbox>
                            </Td>
                            <Td>
                              {i} membre{s} n'{s ? "ont" : "a"} pas été{" "}
                              {isT ? "notifié" : "invité"}
                            </Td>
                          </Tr>
                        );
                      })}
                  </Fragment>
                </Tbody>
              </Table>
            </CheckboxGroup>
            <FormErrorMessage>
              <ErrorMessage errors={errors} name="orgListsNames" />
            </FormErrorMessage>
          </FormControl>
        )}

        <ErrorMessage
          errors={errors}
          name="formErrorMessage"
          render={({ message }) => (
            <Alert status="error" mb={3}>
              <AlertIcon />
              <ErrorMessageText>{message}</ErrorMessageText>
            </Alert>
          )}
        />

        <Flex justifyContent="space-between" mt={3}>
          {onCancel && <Button onClick={onCancel}>Annuler</Button>}

          {type && (
            <Button
              colorScheme="green"
              type="submit"
              isLoading={isLoading}
              isDisabled={
                Object.keys(errors).length > 0 ||
                (type === "single" && !email) ||
                (type === "multi" && !hasItems(orgListsNames))
              }
            >
              Envoyer{" "}
              {isT
                ? type === "single"
                  ? "la notification"
                  : "les notifications"
                : type === "single"
                ? "l'invitation"
                : "les invitations"}
            </Button>
          )}
        </Flex>
      </form>
    </Box>
  );
};

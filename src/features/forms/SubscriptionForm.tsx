import { Alert, AlertIcon, Flex, InputLeftElement } from "@chakra-ui/react";
import { ErrorMessage } from "@hookform/error-message";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { ErrorMessageText, Button, ListsControl } from "features/common";
import { EditOrgPayload, useEditOrgMutation } from "features/api/orgsApi";
import { useAddSubscriptionMutation } from "features/api/subscriptionsApi";
import { IOrg } from "models/Org";
import { EOrgSubscriptionType } from "models/Subscription";
import { hasItems } from "utils/array";
import { emailR } from "utils/email";
import { handleError } from "utils/form";
import { phoneR } from "utils/string";
import { useLeaveConfirm } from "hooks/useLeaveConfirm";
import useFormPersist from "react-hook-form-persist";
import { TagsControl } from "features/common/forms/TagsControl";
import { ItemTag } from "@choc-ui/chakra-autocomplete";
import { AtSignIcon } from "@chakra-ui/icons";

type FormValues = {
  emailList: string;
  phoneList?: string;
  orgLists: { label: string; value: string }[];
};

export const SubscriptionForm = ({
  org,
  onCancel,
  isSubscriptionLoading,
  ...props
}: {
  org: IOrg;
  isSubscriptionLoading: {
    [key: string]: boolean;
  };
  onCancel?: () => void;
  onSubmit: () => void;
}) => {
  const [addSubscription] = useAddSubscriptionMutation();
  const [editOrg] = useEditOrgMutation();

  //#region local state
  const [isLoading, setIsLoading] = useState(false);
  //#endregion

  //#region form
  const {
    clearErrors,
    control,
    errors,
    handleSubmit,
    setError,
    setValue,
    formState,
    watch
  } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      emailList: ""
    }
  });
  useLeaveConfirm({ formState });
  useFormPersist("storageKey", {
    watch,
    setValue,
    storage: window.localStorage // default window.sessionStorage
  });

  const [tags, setTags] = useState<ItemTag[]>([]);

  const onChange = () => clearErrors("formErrorMessage");

  const onSubmit = async (form: FormValues) => {
    console.log("submitted", form);
    setIsLoading(true);
    const { emailList, phoneList, orgLists } = form;

    const emailArray: string[] = tags
      .map(({ label }) => label)
      .concat(emailList)
      .filter((email: string) => emailR.test(email));

    const phoneArray: string[] = (phoneList || "")
      .split(/(\s+)/)
      .filter((e: string) => e.trim().length > 0)
      .filter((phone: string) => phoneR.test(phone));

    try {
      if (!hasItems(emailArray) && !hasItems(phoneArray)) {
        throw new Error("Aucunes coordonnées valide");
      }

      for (const email of emailArray) {
        if (hasItems(orgLists))
          for (const { value: listName } of orgLists) {
            let type;
            if (listName === "Abonnés") type = EOrgSubscriptionType.FOLLOWER;

            if (type)
              await addSubscription({
                email,
                orgs: [
                  {
                    org,
                    orgId: org._id,
                    type,
                    tagTypes: [
                      { type: "Events", emailNotif: true, pushNotif: true },
                      { type: "Projects", emailNotif: true, pushNotif: true },
                      { type: "Topics", emailNotif: true, pushNotif: true }
                    ]
                  }
                ]
              });
            else {
              const subscription = await addSubscription({
                email,
                orgs: [
                  {
                    org,
                    orgId: org._id
                  }
                ]
              }).unwrap();
              const payload: EditOrgPayload = {
                orgLists: org.orgLists.map((orgList) => {
                  if (orgList.listName === listName) {
                    if (!orgList.subscriptions.length)
                      return {
                        ...orgList,
                        subscriptions: [subscription]
                      };

                    return {
                      ...orgList,
                      subscriptions: !orgList.subscriptions.find(
                        ({ _id }) => _id === subscription._id
                      )
                        ? [...orgList.subscriptions, subscription]
                        : orgList.subscriptions
                    };
                  }

                  return orgList;
                })
              };
              await editOrg({ orgId: org._id, payload });
            }
          }
        else
          await addSubscription({
            email,
            orgs: [
              {
                org,
                orgId: org._id
              }
            ]
          });
      }

      // for (const phone of phoneArray) {
      //   for (const type of orgLists) {
      //     await addSubscription({
      //       phone,
      //       payload: {
      //         orgs: [
      //           {
      //             orgId: org._id,
      //             org,
      //             type
      //           }
      //         ]
      //       }
      //     });
      //   }
      // }

      //setValue("orgLists", []);
      setIsLoading(false);
      props.onSubmit && props.onSubmit();
      localStorage.removeItem("storageKey");
    } catch (error) {
      setIsLoading(false);
      handleError(error, (message, field) => {
        if (field) {
          setError(field, { type: "manual", message });
        } else {
          setError("formErrorMessage", { type: "manual", message });
        }
      });
    } finally {
    }
  };
  //#endregion

  return (
    <form onChange={onChange} onSubmit={handleSubmit(onSubmit)}>
      <TagsControl
        name="emailList"
        control={control}
        errors={errors}
        setError={setError}
        setValue={setValue}
        isRequired
        label="Adresse(s) e-mail : "
        leftElement={
          <InputLeftElement cursor="pointer" children={<AtSignIcon />} />
        }
        tags={tags}
        setTags={setTags}
      />

      <ListsControl
        name="orgLists"
        control={control}
        errors={errors}
        setError={setError}
        isRequired
        label="Liste(s) :"
        lists={org.orgLists}
        onChange={onChange}
      />

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

      <Flex justifyContent="space-between">
        {onCancel && (
          <Button colorScheme="red" onClick={onCancel} mr={3}>
            Annuler
          </Button>
        )}

        <Button
          colorScheme="green"
          type="submit"
          isDisabled={
            Object.keys(errors).length > 0 ||
            Object.keys(isSubscriptionLoading).some(
              (_id) => !!isSubscriptionLoading[_id]
            )
          }
          isLoading={isLoading}
          data-cy="orgAddSubscribersSubmit"
        >
          Ajouter
        </Button>
      </Flex>
    </form>
  );
};

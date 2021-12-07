import {
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  useToast,
  Flex,
  Alert,
  AlertIcon,
  Select,
  Tag,
  Tooltip,
  useColorMode
} from "@chakra-ui/react";
import { ErrorMessage } from "@hookform/error-message";
import bcrypt from "bcryptjs";
import { Session } from "next-auth";
import React, { useState, useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import ReactSelect from "react-select";
import usePlacesAutocomplete, { Suggestion } from "use-places-autocomplete";
import {
  AddressControl,
  EmailControl,
  PhoneControl,
  UrlControl,
  Button,
  ErrorMessageText,
  RTEditor,
  PasswordControl,
  PasswordConfirmControl
} from "features/common";
import { withGoogleApi } from "features/map/GoogleApiWrapper";
import {
  useAddOrgMutation,
  useEditOrgMutation,
  useGetOrgsQuery
} from "features/orgs/orgsApi";
import {
  IOrg,
  orgTypeFull,
  orgTypeFull5,
  OrgTypes,
  OrgTypesV,
  Visibility,
  VisibilityV
} from "models/Org";
import { hasItems } from "utils/array";
import { handleError } from "utils/form";
import { unwrapSuggestion } from "utils/maps";
import { normalize } from "utils/string";

export const OrgForm = withGoogleApi({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
})(
  (props: {
    session: Session;
    org?: IOrg;
    orgType?: string;
    setOrgType?: (orgType: string) => void;
    onCancel: () => void;
    onSubmit?: (orgUrl: string) => void;
  }) => {
    const { colorMode } = useColorMode();
    const isDark = colorMode === "dark";
    const toast = useToast({ position: "top" });

    //#region org
    const [addOrg, addOrgMutation] = useAddOrgMutation();
    const [editOrg, editOrgMutation] = useEditOrgMutation();
    //#endregion

    //#region myOrgs
    const { data: myOrgs, isLoading: isQueryLoading } = useGetOrgsQuery(
      {
        createdBy: props.session.user.userId
      },
      {
        selectFromResult: (query) => ({
          ...query,
          data: query.data?.filter((org) =>
            props.org ? org.orgName !== props.org.orgName : true
          )
        })
      }
    );
    //#endregion

    //#region local state
    const containerProps = {
      backgroundColor: isDark ? "gray.700" : "white",
      _hover: {
        borderColor: isDark ? "#5F6774" : "#CBD5E0"
      },
      borderColor: isDark ? "#4F5765" : "gray.200",
      borderWidth: "1px",
      borderRadius: "lg",
      mt: 3,
      p: 3
    };
    const [isLoading, setIsLoading] = useState(false);
    const [suggestion, setSuggestion] = useState<Suggestion>();
    const {
      ready,
      value: autoCompleteValue,
      suggestions: { status, data },
      setValue: setAutoCompleteValue,
      clearSuggestions
    } = usePlacesAutocomplete({
      requestOptions: {
        componentRestrictions: {
          country: "fr"
        }
      },
      debounce: 300
    });
    //#endregion

    //#region form state
    const {
      control,
      register,
      handleSubmit,
      errors,
      setError,
      clearErrors,
      watch,
      getValues,
      setValue
    }: { [key: string]: any } = useForm({
      defaultValues: {
        orgAddress: props.org?.orgAddress,
        orgEmail: props.org?.orgEmail,
        orgPhone: props.org?.orgPhone,
        orgWeb: props.org?.orgWeb
      },
      mode: "onChange"
    });

    const orgAddress = watch("orgAddress");
    const [orgDescriptionHtml, setOrgDescriptionHtml] = useState<
      string | undefined
    >(props.org?.orgDescriptionHtml);
    const orgEmail = watch("orgEmail");
    const orgPhone = watch("orgPhone");
    const orgType = watch("orgType");
    const orgTypeLabel = orgTypeFull(orgType) || "de l'organisation";
    const orgVisibility = watch("orgVisibility");
    const password = useRef({});
    password.current = watch("orgPassword", "");
    const orgWeb = watch("orgWeb");

    const onChange = () => {
      clearErrors("formErrorMessage");
    };

    const onSubmit = async (form: IOrg) => {
      console.log("submitted", form);
      setIsLoading(true);

      const orgAddress = form.orgAddress?.filter(
        ({ address }) => address !== ""
      );
      const orgEmail = form.orgEmail?.filter(({ email }) => email !== "");
      const orgPhone = form.orgPhone?.filter(({ phone }) => phone !== "");
      const orgWeb = form.orgWeb?.filter(({ url }) => url !== "");

      let payload = {
        ...form,
        orgUrl: normalize(form.orgName),
        orgDescription:
          form.orgDescription === "<p><br></p>"
            ? ""
            : form.orgDescription?.replace(/\&nbsp;/g, " "),
        orgDescriptionHtml,
        orgAddress:
          Array.isArray(orgAddress) && orgAddress.length > 0 ? orgAddress : [],
        orgEmail:
          Array.isArray(orgEmail) && orgEmail.length > 0 ? orgEmail : [],
        orgPhone:
          Array.isArray(orgPhone) && orgPhone.length > 0 ? orgPhone : [],
        orgWeb: Array.isArray(orgWeb) && orgWeb.length > 0 ? orgWeb : [],
        orgPassword: form.orgPassword
          ? await bcrypt.hash(form.orgPassword, await bcrypt.genSalt(10))
          : undefined
      };

      try {
        const sugg = suggestion || data[0];

        if (sugg) {
          const {
            lat: orgLat,
            lng: orgLng,
            city: orgCity
          } = await unwrapSuggestion(sugg);
          payload = { ...payload, orgLat, orgLng, orgCity };
        }

        if (props.org) {
          await editOrg({ payload, orgUrl: props.org.orgUrl }).unwrap();

          toast({
            title: `${orgTypeFull5(form.orgType)} a bien été modifiée !`,
            status: "success",
            isClosable: true
          });
        } else {
          payload.createdBy = props.session.user.userId;
          await addOrg(payload).unwrap();

          toast({
            title: `${orgTypeFull5(form.orgType)} a bien été ajoutée !`,
            status: "success",
            isClosable: true
          });
        }

        setIsLoading(false);
        props.onSubmit && props.onSubmit(payload.orgUrl);
      } catch (error) {
        setIsLoading(false);
        handleError(error, (message, field) => {
          setError(field || "formErrorMessage", {
            type: "manual",
            message
          });
        });
      }
    };

    //#endregion

    useEffect(() => {
      if (
        Array.isArray(orgAddress) &&
        orgAddress[0] &&
        orgAddress[0].address !== ""
      )
        if (!suggestion) setAutoCompleteValue(orgAddress[0].address);
    }, [orgAddress]);

    useEffect(() => {
      if (props.setOrgType) props.setOrgType(orgType);
    }, [orgType]);

    return (
      <form onChange={onChange} onSubmit={handleSubmit(onSubmit)}>
        <FormControl
          id="orgName"
          isRequired
          isInvalid={!!errors["orgName"]}
          display="flex"
          flexDirection="column"
          mb={getValues("orgName") ? 0 : 3}
        >
          <FormLabel>Nom {orgTypeLabel}</FormLabel>
          <Input
            name="orgName"
            ref={register({
              required: `Veuillez saisir le nom ${orgTypeLabel}`
              // pattern: {
              //   value: /^[A-zÀ-ú0-9 ]+$/i,
              //   message:
              //     "Veuillez saisir un nom composé de lettres et de chiffres uniquement"
              // }
            })}
            defaultValue={props.org?.orgName}
            placeholder={`Saisir le nom ${orgTypeLabel}`}
          />
          {getValues("orgName") && (
            <Tooltip label={`Adresse de la page de ${orgTypeLabel}`}>
              <Tag mt={3} alignSelf="flex-end" cursor="help">
                {process.env.NEXT_PUBLIC_URL}/{normalize(getValues("orgName"))}
              </Tag>
            </Tooltip>
          )}
          <FormErrorMessage>
            <ErrorMessage errors={errors} name="orgName" />
          </FormErrorMessage>
        </FormControl>

        <FormControl
          id="orgType"
          isRequired
          isInvalid={!!errors["orgType"]}
          mb={3}
        >
          <FormLabel>Type de l'organisation</FormLabel>
          <Select
            name="orgType"
            ref={register({
              required: `Veuillez sélectionner le type de l'organisation`
            })}
            defaultValue={props.org?.orgType || props.orgType}
            placeholder={`Type de l'organisation`}
            color="gray.400"
          >
            {Object.keys(OrgTypes).map((orgType) => {
              return (
                <option key={orgType} value={orgType}>
                  {OrgTypesV[orgType]}
                </option>
              );
            })}
          </Select>
          <FormErrorMessage>
            <ErrorMessage errors={errors} name="orgType" />
          </FormErrorMessage>
        </FormControl>

        <FormControl
          mb={3}
          isInvalid={!!errors["orgs"]}
          display={orgType !== OrgTypes.NETWORK ? "none" : undefined}
        >
          <FormLabel>Organisations faisant partie du réseau</FormLabel>
          <Controller
            name="orgs"
            as={ReactSelect}
            control={control}
            defaultValue={props.org?.orgs || null}
            closeMenuOnSelect
            isClearable
            isMulti
            isSearchable
            menuPlacement="top"
            noOptionsMessage={() => "Aucun résultat"}
            options={myOrgs?.filter(
              ({ orgLat, orgLng }) => !!orgLat && !!orgLng
            )}
            getOptionLabel={(option: any) => option.orgName}
            getOptionValue={(option: any) => option._id}
            placeholder={
              hasItems(myOrgs)
                ? "Rechercher une organisation..."
                : "Vous n'avez créé aucune organisations"
            }
            styles={{
              control: (defaultStyles: any) => {
                return {
                  ...defaultStyles,
                  borderColor: "#e2e8f0",
                  paddingLeft: "8px"
                };
              }
            }}
            className="react-select-container"
            classNamePrefix="react-select"
            onChange={(newValue: any /*, actionMeta*/) => newValue._id}
          />
          <FormErrorMessage>
            <ErrorMessage errors={errors} name="orgs" />
          </FormErrorMessage>
        </FormControl>

        <FormControl
          id="orgDescription"
          isInvalid={!!errors["orgDescription"]}
          mb={3}
        >
          <FormLabel>Description</FormLabel>
          <Controller
            name="orgDescription"
            control={control}
            defaultValue={props.org?.orgDescription || ""}
            render={(renderProps) => {
              return (
                <RTEditor
                  org={props.org}
                  session={props.session}
                  defaultValue={props.org?.orgDescription}
                  placeholder={`Écrire la description ${orgTypeLabel}`}
                  onChange={({ html, quillHtml }) => {
                    setOrgDescriptionHtml(html);
                    renderProps.onChange(quillHtml);
                  }}
                />
              );
            }}
          />

          <FormErrorMessage>
            <ErrorMessage errors={errors} name="orgDescription" />
          </FormErrorMessage>
        </FormControl>

        <FormControl
          isRequired
          isInvalid={!!errors["orgVisibility"]}
          onChange={async (e) => {
            clearErrors("orgOrgs");
          }}
          mb={3}
        >
          <FormLabel>Visibilité</FormLabel>
          <Select
            name="orgVisibility"
            defaultValue={
              props.org?.orgVisibility || Visibility[Visibility.PUBLIC]
            }
            ref={register({
              required: "Veuillez sélectionner la visibilité de l'organisation"
            })}
            placeholder="Visibilité de l'organisation"
            color="gray.400"
          >
            {[Visibility.PUBLIC, Visibility.PRIVATE].map((key) => {
              return (
                <option key={key} value={key}>
                  {VisibilityV[key]}
                </option>
              );
            })}
          </Select>
          <FormErrorMessage>
            <ErrorMessage errors={errors} name="orgVisibility" />
          </FormErrorMessage>
        </FormControl>

        {orgVisibility === Visibility.PRIVATE && (
          <>
            <PasswordControl
              name="orgPassword"
              errors={errors}
              register={register}
              mb={3}
              //isRequired={orgVisibility === Visibility.PRIVATE}
            />
            <PasswordConfirmControl
              name="orgPasswordConfirm"
              errors={errors}
              register={register}
              password={password}
              mb={3}
            />
          </>
        )}

        <AddressControl
          name="orgAddress"
          control={control}
          errors={errors}
          setValue={setValue}
          mb={3}
          containerProps={
            orgAddress && orgAddress[0]
              ? { ...containerProps, mt: 0 }
              : { mb: 3 }
          }
          onSuggestionSelect={(suggestion: Suggestion) => {
            setSuggestion(suggestion);
          }}
        />

        <EmailControl
          name="orgEmail"
          register={register}
          control={control}
          errors={errors}
          setValue={setValue}
          mb={3}
          containerProps={
            orgEmail && orgEmail[0] ? { ...containerProps, mt: 0 } : { mb: 3 }
          }
        />

        <PhoneControl
          name="orgPhone"
          register={register}
          control={control}
          errors={errors}
          setValue={setValue}
          mb={3}
          containerProps={orgPhone && orgPhone[0] ? containerProps : { mb: 3 }}
        />

        <UrlControl
          name="orgWeb"
          register={register}
          control={control}
          errors={errors}
          setValue={setValue}
          mb={3}
          containerProps={
            orgWeb && orgWeb[0] ? { ...containerProps, mb: 3 } : { mb: 3 }
          }
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
          <Button onClick={props.onCancel}>Annuler</Button>

          <Button
            colorScheme="green"
            type="submit"
            isLoading={
              isLoading || addOrgMutation.isLoading || editOrgMutation.isLoading
            }
            isDisabled={Object.keys(errors).length > 0}
            data-cy="orgFormSubmit"
          >
            {props.org ? "Modifier" : "Ajouter"}
          </Button>
        </Flex>
      </form>
    );
  }
);

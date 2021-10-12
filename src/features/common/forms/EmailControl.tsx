import { AtSignIcon, DeleteIcon, EmailIcon } from "@chakra-ui/icons";
import {
  Box,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightAddon,
  InputRightElement,
  SpaceProps
} from "@chakra-ui/react";
// import { Input } from "features/common";
import { ErrorMessage } from "@hookform/error-message";
import React from "react";
import { useFieldArray } from "react-hook-form";
import { Link } from "../Link";

export const EmailControl = ({
  defaultValue,
  errors,
  name,
  label = "Adresse e-mail",
  noLabel,
  control,
  register,
  isRequired = false,
  isMultiple = true,
  onRightElementClick,
  ...props
}: SpaceProps & {
  defaultValue?: string;
  errors: any;
  name: string;
  label?: string;
  noLabel?: boolean;
  control: any;
  register: any;
  isRequired?: boolean;
  isMultiple?: boolean;
  placeholder?: string;
  onRightElementClick?: () => void;
}) => {
  let formRules: { required?: string | boolean } = {};

  if (isRequired) {
    formRules.required = "Veuillez saisir une adresse e-mail";
  }

  if (!isMultiple) {
    return (
      <FormControl
        id={name}
        isRequired={isRequired}
        isInvalid={!!errors[name]}
        {...props}
      >
        {!noLabel && <FormLabel>{label}</FormLabel>}

        <InputGroup>
          <InputLeftElement pointerEvents="none" children={<AtSignIcon />} />
          <Input
            name={name}
            placeholder={
              props.placeholder ||
              "Cliquez ici pour saisir une adresse e-mail..."
            }
            ref={register({
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Adresse email invalide"
              },
              ...formRules
            })}
            defaultValue={defaultValue}
            pl={10}
          />
          {noLabel && onRightElementClick && (
            <InputRightElement
              pointerEvents="none"
              children={<Icon as={EmailIcon} onClick={onRightElementClick} />}
            />
          )}
        </InputGroup>

        <FormErrorMessage>
          <ErrorMessage errors={errors} name={name} />
        </FormErrorMessage>
      </FormControl>
    );
  }

  const { fields, append, prepend, remove, swap, move, insert } = useFieldArray(
    {
      control, // control props comes from useForm (optional: if you are using FormContext)
      name // unique name for your Field Array
      // keyName: "id", default to "id", you can change the key name
    }
  );

  return (
    <Box mb={3}>
      {fields.map((field, index) => {
        return (
          <FormControl
            key={field.id}
            id={name}
            isRequired={isRequired}
            isInvalid={errors[name] && errors[name][index]}
            {...props}
          >
            {!noLabel && (
              <FormLabel m={0}>
                {index > 0 ? `${index + 1}ème ${label.toLowerCase()}` : label}
              </FormLabel>
            )}
            <InputGroup>
              <InputLeftElement
                pointerEvents="none"
                children={<AtSignIcon />}
              />
              <Input
                name={`${name}[${index}].email`}
                placeholder={
                  props.placeholder ||
                  "Cliquez ici pour saisir une adresse e-mail..."
                }
                defaultValue={`${field.email}`} // make sure to set up defaultValue
                ref={register({
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Adresse email invalide"
                  },
                  ...formRules
                })}
              />
              {index > 0 && (
                <InputRightAddon
                  children={
                    <IconButton
                      aria-label={`Supprimer la ${index + 1}ème adresse e-mail`}
                      icon={<DeleteIcon />}
                      onClick={() => remove(index)}
                    />
                  }
                />
              )}
            </InputGroup>
            <FormErrorMessage>
              <ErrorMessage errors={errors} name={`${name}[${index}].email`} />
            </FormErrorMessage>
          </FormControl>
        );
      })}

      <Link
        fontSize="smaller"
        onClick={() => {
          append({ email: "" });
        }}
      >
        <EmailIcon /> Ajouter une adresse e-mail
      </Link>
    </Box>
  );
};

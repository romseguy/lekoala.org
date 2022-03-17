import {
  Badge,
  Box,
  Flex,
  FlexProps,
  Tag,
  TagCloseButton,
  Text,
  Tooltip,
  useColorMode
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { DeleteButton } from "features/common";
import { IOrg } from "models/Org";
import { AppQuery } from "utils/types";
import { useEditOrgMutation } from "features/orgs/orgsApi";

export const TopicsListCategories = ({
  org,
  orgQuery,
  isCreator,
  isSubscribed,
  selectedCategories,
  setSelectedCategories,
  ...props
}: FlexProps & {
  org: IOrg;
  orgQuery: AppQuery<IOrg>;
  isCreator?: boolean;
  isSubscribed?: boolean;
  selectedCategories?: string[];
  setSelectedCategories: React.Dispatch<
    React.SetStateAction<string[] | undefined>
  >;
}) => {
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
  const [editOrg] = useEditOrgMutation();

  useEffect(() => {
    if (!orgQuery.isFetching) {
      let newIsLoading = {};
      Object.keys(isLoading).forEach((key) => {
        isLoading[key] = false;
      });
      setIsLoading(newIsLoading);
    }
  }, [orgQuery.isFetching]);

  return (
    <Flex {...props}>
      {org.orgTopicCategories.map(({ catId, label }, index) => {
        const isSelected = selectedCategories?.find(
          (selectedCategory) => selectedCategory === catId
        );
        const topicsCount = org.orgTopics.filter(
          (topic) => topic.topicCategory === catId
        ).length;

        return (
          <Tag
            key={`category-${index}`}
            bg={
              isSelected
                ? isDark
                  ? "pink.200"
                  : "pink.500"
                : isDark
                ? "#81E6D9"
                : "#319795"
            }
            _hover={{
              bg: isSelected
                ? isDark
                  ? "pink.300"
                  : "pink.600"
                : isDark
                ? "#4FD1C5"
                : "#2C7A7B"
            }}
            color={isDark ? "black" : "white"}
            cursor="pointer"
            fontWeight="normal"
            mr={1}
            p={0}
            onClick={() => {
              selectedCategories?.find(
                (selectedCategory) => selectedCategory === catId
              )
                ? setSelectedCategories(
                    selectedCategories.filter(
                      (selectedCategory) => selectedCategory !== catId
                    )
                  )
                : setSelectedCategories(
                    (selectedCategories || []).concat([catId])
                  );
            }}
          >
            <Tooltip
              label={`Afficher les discussions de la catégorie "${label}"`}
              hasArrow
            >
              <Flex alignItems="center" p={2}>
                <Text fontWeight="bold">{label}</Text>
                {topicsCount > 0 && (
                  <Badge
                    bg={isDark ? "teal" : "#81E6D9"}
                    borderRadius="md"
                    ml={2}
                  >
                    {topicsCount}
                  </Badge>
                )}
              </Flex>
            </Tooltip>

            {(isCreator || isSubscribed) && (
              <Box
                borderColor={isDark ? "#BAC1CB" : "gray.500"}
                borderLeftWidth="1px"
                pr={3}
              >
                <TagCloseButton as="span">
                  <DeleteButton
                    color={isDark ? "black" : "white"}
                    isIconOnly
                    // tooltip props
                    hasArrow
                    label="Supprimer la catégorie"
                    placement="right"
                    // other props
                    header={
                      <>
                        Êtes vous sûr de vouloir supprimer la catégorie {catId}{" "}
                        ?
                      </>
                    }
                    isLoading={isLoading[`category-${index}`]}
                    onClick={async () => {
                      setIsLoading({ [`category-${index}`]: true });
                      try {
                        await editOrg({
                          orgId: org._id,
                          payload: [`orgTopicCategories=${catId}`]
                        });
                        orgQuery.refetch();
                      } catch (error) {
                        setIsLoading({ [`category-${index}`]: false });
                        console.error(error);
                      }
                    }}
                  />
                </TagCloseButton>
              </Box>
            )}
          </Tag>
        );
      })}
    </Flex>
  );
};

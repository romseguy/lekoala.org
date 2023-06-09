import { AddIcon } from "@chakra-ui/icons";
import {
  Alert,
  AlertIcon,
  Box,
  Flex,
  GridProps,
  List,
  ListItem,
  Spinner,
  Text,
  useColorMode,
  useToast
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Button, Grid, Heading } from "features/common";
import {
  NotifModalState,
  EntityNotifModal
} from "features/modals/EntityNotifModal";
import { TopicFormModal } from "features/modals/TopicFormModal";
import {
  useAddSubscriptionMutation,
  useDeleteSubscriptionMutation
} from "features/api/subscriptionsApi";
import { useSession } from "hooks/useSession";
import { IEvent } from "models/Event";
import { IOrg, IOrgList } from "models/Org";
import { ISubscription } from "models/Subscription";
import { ITopic } from "models/Topic";
import { hasItems } from "utils/array";
import { getCategoryLabel, getRefId, isEvent } from "models/Entity";
import { AppQuery, AppQueryWithData } from "utils/types";
import {
  useDeleteTopicMutation,
  useAddTopicNotifMutation
} from "features/api/topicsApi";
import { TopicsListItem } from "./TopicsListItem";
import { TopicsListOrgLists } from "./TopicsListOrgLists";
import { TopicsListCategories } from "./TopicsListCategories";
import { TopicCategoryTag } from "./TopicCategoryTag";

export const TopicsList = ({
  query,
  subQuery,
  currentTopicName,
  ...props
}: GridProps & {
  query: AppQueryWithData<IEvent | IOrg>;
  subQuery: AppQuery<ISubscription>;
  isCreator: boolean;
  isFollowed?: boolean;
  currentTopicName?: string;
}) => {
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";
  const router = useRouter();
  const { data: session } = useSession();
  const toast = useToast({ position: "top" });

  //#region local state
  const [addSubscription] = useAddSubscriptionMutation();
  const addTopicNotifMutation = useAddTopicNotifMutation();
  const [deleteSubscription] = useDeleteSubscriptionMutation();
  const [deleteTopic] = useDeleteTopicMutation();
  const entity = query.data;
  const isE = isEvent(entity);
  const topicCategories = isE
    ? entity.eventTopicCategories
    : entity.orgTopicCategories;
  const [currentTopic, setCurrentTopic] = useState<ITopic | null>(null);
  useEffect(() => {
    if (currentTopicName) {
      const cT =
        topics.find((topic) => topic.topicName === currentTopicName) || null;

      if (cT) setCurrentTopic(cT);
      else if (currentTopic) setCurrentTopic(cT);
    } else if (currentTopic) setCurrentTopic(null);
  }, [currentTopicName]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>();
  const [selectedLists, setSelectedLists] = useState<IOrgList[]>();
  const canDisplay = (topic: ITopic) => {
    if (hasItems(selectedCategories) || hasItems(selectedLists)) {
      let belongsToCategory = false;
      let belongsToList = false;

      if (Array.isArray(selectedCategories) && selectedCategories.length > 0) {
        if (
          topic.topicCategory &&
          selectedCategories.find(
            (selectedCategory) => selectedCategory === topic.topicCategory
          )
        )
          belongsToCategory = true;
      }

      if (isE || entity.orgUrl === "forum") return belongsToCategory;

      if (Array.isArray(selectedLists) && selectedLists.length > 0) {
        if (hasItems(topic.topicVisibility)) {
          let found = false;

          for (let i = 0; i < topic.topicVisibility.length; i++)
            for (let j = 0; j < selectedLists.length; j++)
              if (selectedLists[j].listName === topic.topicVisibility[i])
                found = true;

          if (found) belongsToList = true;
        }
      }

      return belongsToCategory || belongsToList;
    }

    return true;
  };

  const topics = (isE ? entity.eventTopics : entity.orgTopics).filter(
    canDisplay
  );
  //#endregion

  //#region loading state
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
  useEffect(() => {
    if (!query.isFetching) {
      let newIsLoading = {};
      Object.keys(isLoading).forEach((key) => {
        isLoading[key] = false;
      });
      setIsLoading(newIsLoading);
    }
  }, [query.isFetching]);
  //#endregion

  //#region modal state
  const [topicModalState, setTopicModalState] = useState<{
    isOpen: boolean;
    topic?: ITopic;
  }>({
    isOpen: false
  });

  const onClose = () =>
    setTopicModalState({
      ...topicModalState,
      isOpen: false,
      topic: undefined
    });
  const [notifyModalState, setNotifyModalState] = useState<
    NotifModalState<ITopic>
  >({});
  //#endregion

  const onClick = (topic: ITopic) => {
    let url = `${router.asPath}/${topic.topicName}`;

    if (router.asPath.includes(topic.topicName)) {
      url = `/${isE ? entity.eventUrl : entity.orgUrl}/discussions`;
    }

    router.push(url, url, { shallow: true });
  };

  const onDeleteClick = async (topic: ITopic) => {
    setIsLoading({
      [topic._id]: true
    });

    try {
      const deletedTopic = await deleteTopic(topic._id).unwrap();
      query.refetch();
      subQuery.refetch();
      toast({
        title: `${deletedTopic.topicName} a été supprimé !`,
        status: "success"
      });
    } catch (error: any) {
      toast({
        title: `La discussion ${topic.topicName} n'a pas pu être supprimée`,
        status: "error"
      });
    } finally {
      setIsLoading({
        [topic._id]: false
      });
    }
  };

  const onEditClick = (topic: ITopic) => {
    setTopicModalState({
      ...topicModalState,
      isOpen: true,
      topic
    });
  };

  const onNotifClick = (topic: ITopic) => {
    setNotifyModalState({
      ...notifyModalState,
      entity: topic
    });
  };

  const onSubscribeClick = async (topic: ITopic, isSubbedToTopic: boolean) => {
    setIsLoading({
      [topic._id]: true
    });

    if (!subQuery.data || !isSubbedToTopic) {
      try {
        await addSubscription({
          topics: [
            {
              topic: topic,
              emailNotif: true,
              pushNotif: true
            }
          ],
          user: session?.user.userId
        });

        toast({
          title: `Vous êtes abonné à la discussion ${topic.topicName}`,
          status: "success"
        });
      } catch (error) {
        console.error(error);
        toast({
          title: `Vous n'avez pas pu être abonné à la discussion ${topic.topicName}`,
          status: "error"
        });
      }
    } else if (isSubbedToTopic) {
      const unsubscribe = confirm(
        `Êtes vous sûr de vouloir vous désabonner de la discussion : ${topic.topicName} ?`
      );

      if (unsubscribe) {
        try {
          await deleteSubscription({
            subscriptionId: subQuery.data._id,
            topicId: topic._id
          });

          toast({
            title: `Vous êtes désabonné de ${topic.topicName}`,
            status: "success"
          });
        } catch (error) {
          console.error(error);
          toast({
            title: `Vous n'avez pas pu être désabonné à la discussion ${topic.topicName}`,
            status: "error"
          });
        }
      }
    }

    query.refetch();
    subQuery.refetch();
    setIsLoading({
      [topic._id]: false
    });
  };

  return (
    <>
      <Box>
        <Button
          colorScheme="teal"
          leftIcon={<AddIcon />}
          mb={5}
          onClick={() => {
            if (!session) {
              router.push("/login", "/login", { shallow: true });
              return;
            }

            setTopicModalState({ ...topicModalState, isOpen: true });
          }}
          data-cy="topic-add-button"
        >
          Ajouter une discussion
        </Button>

        {topicModalState.isOpen && (
          <TopicFormModal
            {...topicModalState}
            query={query}
            subQuery={subQuery}
            isCreator={props.isCreator}
            isFollowed={props.isFollowed}
            onCancel={onClose}
            onSubmit={async (topic) => {
              query.refetch();
              subQuery.refetch();
              onClose();
            }}
            onClose={onClose}
          />
        )}
      </Box>

      {(props.isCreator || topicCategories.length > 0) && (
        <Flex flexDirection="column" mb={3}>
          <Heading smaller>Catégories</Heading>
          <TopicsListCategories
            query={query}
            isCreator={props.isCreator}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
          />
        </Flex>
      )}

      {!isE &&
        session &&
        entity.orgUrl !== "forum" &&
        hasItems(entity.orgLists) && (
          <Flex flexDirection="column" mb={3}>
            <Heading smaller>Listes</Heading>
            <TopicsListOrgLists
              org={entity}
              isCreator={props.isCreator}
              selectedLists={selectedLists}
              session={session}
              setSelectedLists={setSelectedLists}
              subQuery={subQuery}
            />
          </Flex>
        )}

      <Grid data-cy="topic-list">
        {query.isLoading ? (
          <Spinner />
        ) : !topics.length ? (
          <Alert status="warning" mb={3}>
            <AlertIcon />
            <Flex flexDirection="column">
              {(selectedCategories && selectedCategories.length >= 1) ||
              (selectedLists && selectedLists.length >= 1) ? (
                <>
                  {selectedLists &&
                  selectedLists.length >= 1 &&
                  selectedCategories &&
                  selectedCategories.length >= 1 ? (
                    <>
                      Aucune discussions appartenant :
                      <List listStyleType="square" ml={5}>
                        <ListItem mb={1}>
                          aux catégories :
                          {selectedCategories.map((catId, index) => (
                            <>
                              <TopicCategoryTag key={index} mx={1}>
                                {getCategoryLabel(topicCategories, catId)}
                              </TopicCategoryTag>
                              {index !== selectedCategories.length - 1 && "ou"}
                            </>
                          ))}
                        </ListItem>
                        <ListItem>
                          aux listes :
                          {selectedLists.map(({ listName }, index) => (
                            <>
                              <TopicCategoryTag mx={1}>
                                {listName}
                              </TopicCategoryTag>
                              {index !== selectedLists.length - 1 && "ou"}
                            </>
                          ))}
                        </ListItem>
                      </List>
                    </>
                  ) : selectedCategories && selectedCategories.length >= 1 ? (
                    <Box>
                      {selectedCategories.length === 1 ? (
                        <>
                          Aucune discussions appartenant à la catégorie{" "}
                          <TopicCategoryTag>
                            {getCategoryLabel(
                              topicCategories,
                              selectedCategories[0]
                            )}
                          </TopicCategoryTag>
                        </>
                      ) : (
                        <>
                          Aucune discussions appartenant aux catégories
                          {selectedCategories.map((catId, index) => (
                            <>
                              <TopicCategoryTag key={index} mx={1}>
                                {getCategoryLabel(topicCategories, catId)}
                              </TopicCategoryTag>
                              {index !== selectedCategories.length - 1 && "ou"}
                            </>
                          ))}
                        </>
                      )}
                    </Box>
                  ) : selectedLists && selectedLists.length >= 1 ? (
                    <Box>
                      {selectedLists.length === 1 ? (
                        <>
                          Aucune discussions appartenant à la liste{" "}
                          <TopicCategoryTag>
                            {selectedLists[0].listName}
                          </TopicCategoryTag>
                        </>
                      ) : (
                        <>
                          Aucune discussions appartenant aux listes
                          {selectedLists.map(({ listName }, index) => (
                            <>
                              <TopicCategoryTag mx={1}>
                                {listName}
                              </TopicCategoryTag>
                              {index !== selectedLists.length - 1 && "ou"}
                            </>
                          ))}
                        </>
                      )}
                    </Box>
                  ) : (
                    <>todo</>
                  )}
                </>
              ) : (
                <Text>Aucune discussions.</Text>
              )}
            </Flex>
          </Alert>
        ) : (
          topics.map((topic, topicIndex) => {
            const isCurrent = topic._id === currentTopic?._id;
            const isTopicCreator =
              props.isCreator || getRefId(topic) === session?.user.userId;
            const isSubbedToTopic = !!subQuery.data?.topics?.find(
              (topicSubscription) => {
                if (!topicSubscription.topic) return false;
                return topicSubscription.topic._id === topic._id;
              }
            );

            return (
              <TopicsListItem
                key={topic._id}
                session={session}
                isCreator={props.isCreator}
                query={query}
                currentTopicName={currentTopicName}
                topic={topic}
                topicIndex={topicIndex}
                isSubbedToTopic={isSubbedToTopic}
                isCurrent={isCurrent}
                isTopicCreator={isTopicCreator}
                isDark={isDark}
                isLoading={isLoading[topic._id] || query.isLoading}
                selectedCategories={selectedCategories}
                setSelectedCategories={setSelectedCategories}
                mb={topicIndex < topics.length - 1 ? 5 : 0}
                onClick={onClick}
                onDeleteClick={onDeleteClick}
                onEditClick={onEditClick}
                onNotifClick={onNotifClick}
                onSubscribeClick={onSubscribeClick}
              />
            );
          })
        )}
      </Grid>

      {session && (
        <EntityNotifModal
          query={query}
          mutation={addTopicNotifMutation}
          setModalState={setNotifyModalState}
          modalState={notifyModalState}
          session={session}
        />
      )}
    </>
  );
};

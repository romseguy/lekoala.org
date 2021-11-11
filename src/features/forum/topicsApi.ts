import type { ITopic } from "models/Topic";
import { createApi, fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";
import baseQuery from "utils/query";
import { IOrg } from "models/Org";
import { IEvent } from "models/Event";

//const baseQueryWithRetry = retry(baseQuery, { maxRetries: 10 });

export const topicsApi = createApi({
  reducerPath: "topicsApi", // We only specify this because there are many services. This would not be common in most applications
  //baseQuery: baseQueryWithRetry,
  baseQuery,
  tagTypes: ["Topics"],
  endpoints: (build) => ({
    addTopic: build.mutation<
      ITopic,
      {
        payload: {
          topic: Partial<ITopic>;
          org?: Partial<IOrg>;
          event?: Partial<IEvent>;
        };
        topicNotif?: boolean;
      }
    >({
      query: ({ payload, topicNotif }) => {
        console.log("addTopic: payload", payload);
        console.log("addTopic: topicNotif", topicNotif);

        return {
          url: `topics`,
          method: "POST",
          body: { ...payload, topicNotif }
        };
      },
      invalidatesTags: [{ type: "Topics", id: "LIST" }]
    }),
    deleteTopic: build.mutation<ITopic, string>({
      query: (topicId) => ({ url: `topic/${topicId}`, method: "DELETE" })
    }),
    editTopic: build.mutation<
      {},
      { payload: Partial<ITopic>; topicId?: string; topicNotif?: boolean }
    >({
      query: ({ payload, topicId, topicNotif }) => {
        console.log("editTopic: topicId", topicId);
        console.log("editTopic: topicNotif", topicNotif);
        console.log("editTopic: payload", payload);

        return {
          url: `topic/${topicId ? topicId : payload._id}`,
          method: "PUT",
          body: { ...payload, topicNotif }
        };
      }
    }),
    postTopicNotif: build.mutation<
      string[],
      {
        payload: {
          org?: IOrg;
          event?: IEvent;
        };
        topicId: string;
      }
    >({
      query: ({ payload, topicId }) => ({
        url: `topic/${topicId}`,
        method: "POST",
        body: payload
      })
    })
    // getTopics: build.query<ITopic[], undefined>({
    //   query: () => ({ url: `topics` })
    // }),
    // getTopicByName: build.query<ITopic, string>({
    //   query: (topicUrl) => ({ url: `topic/${topicUrl}` })
    // }),
    // getTopicsByCreator: build.query<ITopic[], string>({
    //   query: (createdBy) => ({ url: `topics/${createdBy}` })
    // })
  })
});

export const {
  useAddTopicMutation,
  // useAddTopicDetailsMutation,
  usePostTopicNotifMutation,
  useDeleteTopicMutation,
  useEditTopicMutation
  // useGetTopicsQuery,
  // useGetTopicByNameQuery,
  // useGetTopicsByCreatorQuery
} = topicsApi;
export const {
  endpoints: {
    /* getTopicByName, getTopics, getTopicsByCreator */
  }
} = topicsApi;

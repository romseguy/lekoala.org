import type { IEvent } from "models/Event";
import type { ITopic } from "models/Topic";
import { createApi } from "@reduxjs/toolkit/query/react";
import baseQuery from "utils/query";

export const eventApi = createApi({
  reducerPath: "eventsApi",
  baseQuery,
  tagTypes: ["Events"],
  endpoints: (build) => ({
    addEvent: build.mutation<IEvent, Partial<IEvent>>({
      query: (body) => ({
        url: `events`,
        method: "POST",
        body
      }),
      invalidatesTags: [{ type: "Events", id: "LIST" }]
    }),
    addEventDetails: build.mutation<
      IEvent,
      { payload: { topic?: ITopic }; eventUrl?: string }
    >({
      query: ({ payload, eventUrl }) => ({
        url: `event/${eventUrl}`,
        method: "POST",
        body: payload
      })
    }),
    deleteEvent: build.mutation<IEvent, string>({
      query: (eventUrl) => ({ url: `event/${eventUrl}`, method: "DELETE" })
    }),
    editEvent: build.mutation<
      { emailList?: string[] },
      { payload: Partial<IEvent>; eventUrl?: string }
    >({
      query: ({ payload, eventUrl }) => ({
        url: `event/${eventUrl || payload.eventUrl}`,
        method: "PUT",
        body: payload
      })
    }),
    getEvents: build.query<IEvent[], void>({
      query: () => ({ url: `events` })
    }),
    getEventByName: build.query<IEvent, string>({
      query: (eventUrl) => ({ url: `event/${eventUrl}` })
    }),
    getEventsByCreator: build.query<IEvent[], string>({
      query: (createdBy) => ({ url: `events/${createdBy}` })
    })
  })
});

export const {
  useAddEventMutation,
  useAddEventDetailsMutation,
  useEditEventMutation,
  useGetEventsQuery,
  useGetEventByNameQuery,
  useDeleteEventMutation
} = eventApi;
export const {
  endpoints: { getEvents, getEventByName, getEventsByCreator, deleteEvent }
} = eventApi;

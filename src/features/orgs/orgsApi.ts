import { createApi } from "@reduxjs/toolkit/query/react";
import { IOrg } from "models/Org";
import baseQuery, { objectToQueryString } from "utils/query";
export type AddOrgPayload = Pick<
  IOrg,
  | "orgName"
  | "orgType"
  | "orgs"
  | "orgDescription"
  | "orgVisibility"
  | "orgPassword"
  | "orgSalt"
  | "orgAddress"
  | "orgCity"
  | "orgLat"
  | "orgLng"
  | "orgEmail"
  | "orgPhone"
  | "orgWeb"
>;

export type EditOrgPayload = Partial<IOrg> | string[];

export type GetOrgParams = {
  orgUrl: string;
  hash?: string | void;
  populate?: string;
};

export const orgApi = createApi({
  reducerPath: "orgsApi",
  baseQuery,
  tagTypes: ["Orgs"],
  endpoints: (build) => ({
    addOrg: build.mutation<IOrg, AddOrgPayload>({
      query: (payload) => {
        console.groupCollapsed("addOrg");
        console.log("payload", payload);
        console.groupEnd();

        return {
          url: `orgs`,
          method: "POST",
          body: payload
        };
      }
      // invalidatesTags: [{ type: "Orgs", id: "LIST" }]
    }),
    deleteOrg: build.mutation<IOrg, string>({
      query: (orgId) => ({ url: `org/${orgId}`, method: "DELETE" })
    }),
    editOrg: build.mutation<{}, { payload: EditOrgPayload; orgId?: string }>({
      query: ({ payload, orgId }) => {
        const id = orgId ? orgId : "_id" in payload ? payload._id : undefined;

        console.groupCollapsed("editOrg");
        console.log("orgId", id);
        console.log("payload", payload);
        console.groupEnd();

        return {
          url: `org/${id}`,
          method: "PUT",
          body: payload
        };
      }
      // invalidatesTags: (result, error, params) => [
      //   { type: "Orgs", id: params.payload._id }
      // ]
    }),
    getOrg: build.query<IOrg, GetOrgParams>({
      query: ({ orgUrl, ...query }) => {
        console.groupCollapsed("getOrg");
        console.log("orgUrl", orgUrl);
        console.log("hash", query.hash);
        console.log("populate", query.populate);
        console.groupEnd();

        return {
          url: `org/${orgUrl}?${objectToQueryString(query)}`
        };
      }
      // providesTags: (result, error, params) => [
      //   { type: "Orgs" as const, id: result?._id }
      // ]
    }),
    getOrgs: build.query<
      IOrg[],
      { populate?: string; createdBy?: string } | void
    >({
      query: (query) => {
        console.groupCollapsed("getOrgs");
        if (query) {
          console.log("createdBy", query.createdBy);
          console.log("populate", query.populate);
        }
        console.groupEnd();

        return {
          url: `orgs${query ? `?${objectToQueryString(query)}` : ""}`
        };
      }
      // providesTags: (result) =>
      //   result
      //     ? [
      //         ...result.map(({ _id }) => ({
      //           type: "Orgs" as const,
      //           id: _id
      //         })),
      //         { type: "Orgs", id: "LIST" }
      //       ]
      //     : [{ type: "Orgs", id: "LIST" }]
    })
  })
});

export const {
  useAddOrgMutation,
  useDeleteOrgMutation,
  useEditOrgMutation,
  useGetOrgQuery,
  useGetOrgsQuery
} = orgApi;
export const {
  endpoints: { getOrg, getOrgs }
} = orgApi;

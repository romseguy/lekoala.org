import { EOrgType, IOrg } from "models/Org";
import { objectToQueryString } from "utils/query";
import { api } from "./";

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
  | "orgPermissions"
>;

export type EditOrgPayload = Partial<IOrg> | string[];

export type GetOrgParams = {
  orgUrl: string;
  hash?: string | void;
  populate?: string;
};

export type GetOrgsParams = {
  orgType?: EOrgType;
  populate?: string;
  createdBy?: string;
};

export const orgApi = api.injectEndpoints({
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
      },
      invalidatesTags: [{ type: "Orgs", id: "LIST" }]
    }),
    deleteOrg: build.mutation<IOrg, string>({
      query: (orgId) => ({ url: `org/${orgId}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Orgs", id: "LIST" }]
    }),
    editOrg: build.mutation<IOrg, { payload: EditOrgPayload; orgId?: string }>({
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
      },
      invalidatesTags: (result, error, params) => [
        { type: "Orgs", id: params.orgId }
      ]
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
      },
      providesTags: (result, error, params) => [
        { type: "Orgs" as const, id: result?._id }
      ]
    }),
    getOrgs: build.query<IOrg[], GetOrgsParams | void>({
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
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({
                type: "Orgs" as const,
                id: _id
              })),
              { type: "Orgs", id: "LIST" }
            ]
          : [{ type: "Orgs", id: "LIST" }]
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

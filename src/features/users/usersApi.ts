import { api } from "features/api";
import { IUser } from "models/User";
import { objectToQueryString } from "utils/query";

export type UserQueryParams = {
  slug: string;
  populate?: string;
  select?: string;
};

export const userApi = api.injectEndpoints({
  endpoints: (build) => ({
    addUser: build.mutation<IUser, Partial<IUser>>({
      query: (payload) => ({
        url: `users`,
        method: "POST",
        body: payload
      })
    }),
    editUser: build.mutation<IUser, { payload: Partial<IUser>; slug: string }>({
      query: ({ payload, slug }) => ({
        url: `user/${slug}`,
        method: "PUT",
        body: payload
      }),
      invalidatesTags: (result, error, params) =>
        result ? [{ type: "Users", id: result._id }] : []
    }),
    getUser: build.query<IUser, UserQueryParams>({
      query: ({ slug, ...query }) => {
        const hasQueryParams = Object.keys(query).length > 0;
        if (hasQueryParams) {
          console.groupCollapsed("getUser");
          console.log("populate", query.populate);
          console.log("select", query.select);
          console.groupEnd();
        } else console.log("getUser");

        return {
          url: `user/${slug}${
            hasQueryParams ? `?${objectToQueryString(query)}` : ""
          }`
        };
      },
      providesTags: (result, error, params) => [
        { type: "Users" as const, id: result?._id }
      ]
    })
  })
});

export const { useAddUserMutation, useEditUserMutation, useGetUserQuery } =
  userApi;
export const {
  endpoints: { getUser }
} = userApi;

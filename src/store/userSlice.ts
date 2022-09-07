import type { PayloadAction } from "@reduxjs/toolkit";
import type { AppState } from "store";
import { createSlice } from "@reduxjs/toolkit";

type UserState = {
  userEmail: string;
};

const initialState: UserState = { userEmail: "" };

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    resetUserEmail: (state) => {
      state.userEmail = initialState.userEmail;
    },
    setUserEmail: (state, action: PayloadAction<string>) => {
      state.userEmail = action.payload;
    }
  }
});

export const { resetUserEmail, setUserEmail } = userSlice.actions;

export const selectUserEmail = (state: AppState) => state.user.userEmail;

export default userSlice.reducer;
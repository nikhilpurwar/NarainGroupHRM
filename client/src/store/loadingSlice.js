import { createSlice } from "@reduxjs/toolkit";

const loadingSlice = createSlice({
  name: "loading",
  initialState: {
    global: false
  },
  reducers: {
    startLoading: (state) => {
      state.global = true;
    },
    stopLoading: (state) => {
      state.global = false;
    }
  }
});

export const { startLoading, stopLoading } = loadingSlice.actions;
export default loadingSlice.reducer;
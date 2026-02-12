import { useSelector } from "react-redux"; 
export const useGlobalLoading = () =>
     useSelector(state => state.loading.global);
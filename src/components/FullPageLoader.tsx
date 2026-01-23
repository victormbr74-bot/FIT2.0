import { Box, CircularProgress } from "@mui/material";

export function FullPageLoader() {
  return (
    <Box
      minHeight="60vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{ width: "100%" }}
    >
      <CircularProgress />
    </Box>
  );
}

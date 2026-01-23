import { Alert, Box } from "@mui/material";
import { AuthProvider } from "./contexts/AuthContext";
import { AppRoutes } from "./routes/AppRoutes";
import { isFirebaseConfigured } from "./services/firebase";

export default function App() {
  return (
    <AuthProvider>
      <Box minHeight="100vh">
        {!isFirebaseConfigured && (
          <Alert
            severity="warning"
            sx={{
              borderRadius: 0,
              position: "sticky",
              top: 0,
              zIndex: 10
            }}
          >
            Configure o Firebase no .env
          </Alert>
        )}
        <AppRoutes />
      </Box>
    </AuthProvider>
  );
}

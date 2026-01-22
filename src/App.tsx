import { Container, Paper, Typography } from "@mui/material";

export default function App() {
  return (
    <main>
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper
          elevation={4}
          sx={{
            p: 4,
            borderRadius: 3,
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.9), rgba(224, 242, 241, 0.9))"
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            SouFIT
          </Typography>
          <Typography variant="body1">
            Bem-vindo ao aplicativo SouFIT. Estamos preparando o fluxo de login,
            onboarding e treinos semanais com Firebase e GitHub Pages.
          </Typography>
        </Paper>
      </Container>
    </main>
  );
}

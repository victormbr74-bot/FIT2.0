import { Box, Container, Paper, Typography } from "@mui/material";

export function OnboardingPage() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Bem-vindo ao SouFIT
        </Typography>
        <Typography>
          Estamos preparando o questionário inicial para conhecer seu perfil,
          objetivos e rotina. Em breve você poderá definir peso, metas e treinos
          que serão salvos no Firebase para acompanhar a evolução.
        </Typography>
      </Paper>
    </Container>
  );
}

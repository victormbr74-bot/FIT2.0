import { Container, Paper, Typography } from "@mui/material";

export function DietPage() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dieta
        </Typography>
        <Typography>
          Esta tela vai exibir o PDF da dieta, checklist do dia e registro de
          pontos relacionados à alimentação.
        </Typography>
      </Paper>
    </Container>
  );
}

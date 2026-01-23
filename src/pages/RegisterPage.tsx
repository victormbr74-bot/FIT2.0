import { Alert, Button, Link, Stack, TextField, Typography } from "@mui/material";
import { FormEvent, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isFirebaseConfigured } from "../services/firebase";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name || !email || !password) {
      setError("Preencha todos os campos.");
      return;
    }

    setError("");
    try {
      setLoading(true);
      await register(name.trim(), email.trim(), password);
      navigate("/onboarding", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível criar a conta.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 440,
        margin: "0 auto",
        padding: "2rem 1rem"
      }}
    >
      <Stack spacing={2}>
        <Typography variant="h4" component="h1" textAlign="center">
          Criar conta
        </Typography>
        {!isFirebaseConfigured && (
          <Alert severity="warning">Configure o Firebase no .env</Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Nome"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          label="E-mail"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Senha"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          helperText="Use 6 caracteres ou mais"
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!isFirebaseConfigured || loading}
        >
          {loading ? "Criando..." : "Registrar"}
        </Button>
        <Typography variant="body2" textAlign="center">
          Já possui conta?{" "}
          <Link component={RouterLink} to="/login">
            Entrar
          </Link>
        </Typography>
      </Stack>
    </form>
  );
}

import { Alert, Button, Link, Stack, TextField, Typography } from "@mui/material";
import { FormEvent, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isFirebaseConfigured } from "../services/firebase";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setError("Informe e-mail e senha.");
      return;
    }

    setError("");
    try {
      setLoading(true);
      await login(email.trim(), password);
      navigate("/home", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível fazer login.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 420,
        margin: "0 auto",
        padding: "2rem 1rem"
      }}
    >
      <Stack spacing={2}>
        <Typography variant="h4" component="h1" textAlign="center">
          Entrar
        </Typography>
        {!isFirebaseConfigured && (
          <Alert severity="warning">Configure o Firebase no .env</Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="E-mail"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
        <TextField
          label="Senha"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!isFirebaseConfigured || loading}
        >
          {loading ? "Validando..." : "Entrar"}
        </Button>
        <Typography variant="body2" textAlign="center">
          Ainda não tem conta?{" "}
          <Link component={RouterLink} to="/register">
            Crie uma
          </Link>
        </Typography>
      </Stack>
    </form>
  );
}

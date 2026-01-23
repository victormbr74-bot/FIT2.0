import { ThemeProvider, createTheme, ThemeOptions } from "@mui/material";
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

type ThemeModeContextValue = {
  mode: ThemeMode;
  toggleMode: () => void;
};

const STORAGE_KEY = "fit-theme-mode";

const getInitialMode = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "dark";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return "dark";
};

const buildTheme = (mode: ThemeMode) => {
  const palette: ThemeOptions["palette"] = {
    mode,
    primary: {
      main: mode === "dark" ? "#00bcd4" : "#0a64ff"
    },
    secondary: {
      main: mode === "dark" ? "#ff4081" : "#ff6d00"
    },
    background: {
      default: mode === "dark" ? "#030912" : "#f5f7fb",
      paper: mode === "dark" ? "#0a1521" : "#ffffff"
    },
    text: {
      primary: mode === "dark" ? "#f4f8ff" : "#0d1b2a",
      secondary: mode === "dark" ? "#aab8d7" : "#4f5961"
    },
    divider: mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.15)"
  };

  return createTheme({
    palette,
    spacing: 8,
    typography: {
      fontFamily: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
      button: {
        textTransform: "none",
        fontWeight: 700
      },
      h4: {
        fontWeight: 700,
        letterSpacing: "0.02em"
      },
      h5: {
        fontWeight: 600
      },
      body1: {
        fontWeight: 500
      }
    },
    shape: {
      borderRadius: 16
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            border: "1px solid",
            borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(18,52,84,0.08)",
            boxShadow: mode === "dark" ? "0 20px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(10,30,80,0.12)"
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            padding: "10px 20px",
            boxShadow: "none"
          },
          contained: {
            boxShadow: "none"
          }
        }
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            fontWeight: 700
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background:
              mode === "dark"
                ? "linear-gradient(180deg, rgba(5,16,29,0.9), rgba(5,16,29,0.85))"
                : "linear-gradient(180deg, #0d47a1, #1a75ff)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.35)"
          }
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: mode === "dark" ? "#061021" : "#e3edff"
          }
        }
      }
    }
  });
};

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const theme = useMemo(() => buildTheme(mode), [mode]);

  const toggleMode = () => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode precisa estar dentro de ThemeModeProvider");
  }
  return context;
}

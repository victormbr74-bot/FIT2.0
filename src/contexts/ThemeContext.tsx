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
  const primaryMain = mode === "dark" ? "#00d8ff" : "#0a64ff";
  const secondaryMain = mode === "dark" ? "#ff6b6b" : "#ff6d00";
  const palette: ThemeOptions["palette"] = {
    mode,
    primary: {
      main: primaryMain
    },
    secondary: {
      main: secondaryMain
    },
    background: {
      default: mode === "dark" ? "#020814" : "#f3f6fb",
      paper: mode === "dark" ? "#0b1320" : "#ffffff"
    },
    text: {
      primary: mode === "dark" ? "#f4f8ff" : "#0f172a",
      secondary: mode === "dark" ? "#aab8d7" : "#475569"
    },
    divider: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.12)"
  };

  return createTheme({
    palette,
    spacing: 8,
    typography: {
      fontFamily:
        '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
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
            borderColor: mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.08)",
            background: mode === "dark"
              ? "linear-gradient(180deg, rgba(9,18,36,0.95), rgba(5,8,20,0.95))"
              : undefined,
            boxShadow:
              mode === "dark"
                ? "0 15px 40px rgba(0,0,0,0.45)"
                : "0 15px 35px rgba(15,23,42,0.15)"
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            padding: "12px 26px",
            fontWeight: 700,
            boxShadow: "0 12px 30px rgba(0,0,0,0.25)"
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${primaryMain}, ${secondaryMain})`,
            color: "#fff",
            boxShadow: "0 15px 25px rgba(0,0,0,0.45)"
          },
          outlinedPrimary: {
            borderColor: primaryMain
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999
          }
        }
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            margin: "4px 8px",
            transition: "background 0.3s"
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
                ? "linear-gradient(180deg, rgba(4,8,16,0.95), rgba(6,12,24,0.95))"
                : "linear-gradient(180deg, #0d47a1, #1a75ff)",
            boxShadow: "0 12px 35px rgba(0,0,0,0.45)"
          }
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: mode === "dark" ? "#050b1b" : "#e3edff"
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

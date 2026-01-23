import {
  AppBar,
  Box,
  Button,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import InsightsIcon from "@mui/icons-material/Insights";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import { ReactNode, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const drawerWidth = 220;

const navItems = [
  { label: "Home", path: "/home", icon: <HomeIcon /> },
  { label: "Workout", path: "/workout", icon: <FitnessCenterIcon /> },
  { label: "Diet", path: "/diet", icon: <RestaurantMenuIcon /> },
  { label: "Progress", path: "/progress", icon: <InsightsIcon /> },
  { label: "Settings", path: "/settings", icon: <SettingsIcon /> }
];

function NavigationList({ onClick }: { onClick?: () => void }) {
  return (
    <List sx={{ pt: 0 }}>
      {navItems.map((item) => (
        <ListItemButton
          component={NavLink}
          to={item.path}
          key={item.path}
          onClick={onClick}
            sx={(theme) => ({
              "&.active": {
                backgroundColor: "rgba(255,255,255,0.08)",
                color: theme.palette.primary.main,
                "& .MuiListItemIcon-root": {
                  color: theme.palette.primary.main
                }
              }
            })}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
    </List>
  );
}

export function MainLayout() {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const drawerContent = (
    <Box sx={{ width: drawerWidth, display: "flex", flexDirection: "column" }}>
      <Toolbar>
        <Typography variant="h6">SouFIT</Typography>
      </Toolbar>
      <Divider />
      <NavigationList onClick={() => setMobileOpen(false)} />
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <List>
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Sair" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            sx={{ mr: 2, display: { sm: "none" } }}
            onClick={handleDrawerToggle}
            size="large"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            SouFIT
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true
        }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth }
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth }
        }}
        open
      >
        {drawerContent}
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` }
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

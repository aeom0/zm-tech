import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DashboardScreen from "@/screens/DashboardScreen";
import AgendaScreen from "@/screens/AgendaScreen";
import ServicesScreen from "@/screens/ServicesScreen";
import MoreStackNavigator from "@/navigation/MoreStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing } from "@/constants/theme";

export type MainTabParamList = {
  Dashboard: undefined;
  Agenda: { appointmentId?: string };
  Services: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const screenOptions = {
    tabBarActiveTintColor: Colors.light.violet,
    tabBarInactiveTintColor: theme.textMuted,
    tabBarStyle: {
      position: "absolute" as const,
      backgroundColor: Platform.select({
        ios: "transparent",
        android: theme.backgroundRoot,
        web: theme.backgroundRoot,
      }),
      borderTopWidth: 0,
      elevation: 0,
      height: 60 + insets.bottom,
      paddingBottom: insets.bottom,
    },
    tabBarBackground: () =>
      Platform.OS === "ios" ? (
        <BlurView
          intensity={100}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      ) : null,
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: "500" as const,
      marginTop: -4,
    },
    headerTransparent: true,
    headerBlurEffect:
      Platform.OS === "ios" ? (isDark ? "dark" : "light") : undefined,
    headerTintColor: theme.text,
    headerStyle: {
      backgroundColor: Platform.select({
        ios: undefined,
        android: theme.backgroundRoot,
        web: theme.backgroundRoot,
      }),
    },
    headerTitleStyle: {
      fontWeight: "600",
      fontSize: 17,
    },
  };

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={screenOptions as any}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: "Inicio",
          headerTitle: "ZM Lash & Nails",
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Agenda"
        component={AgendaScreen}
        options={{
          title: "Agenda",
          headerTitle: "Agenda",
          tabBarIcon: ({ color }) => (
            <Feather name="calendar" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Services"
        component={ServicesScreen}
        options={{
          title: "Servicios",
          headerTitle: "Servicios",
          tabBarIcon: ({ color }) => (
            <Feather name="star" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{
          title: "Más",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Feather name="menu" size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

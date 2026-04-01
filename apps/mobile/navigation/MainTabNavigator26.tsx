import React from "react";
import { createNativeBottomTabNavigator } from "@react-navigation/bottom-tabs/unstable";
import { Feather } from "@expo/vector-icons";

import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";

export type MainTabParamList = {
  HomeTab: undefined;
  ProfileTab: undefined;
};

const Tab = createNativeBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator26() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={
          {
            title: "Home",
            tabBarIcon: ({ focused }: { focused: boolean }) => (
              <Feather
                name="home"
                size={22}
                color={focused ? "#0B7B72" : "#8A8A8A"}
              />
            ),
          } as any
        }
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={
          {
            title: "Profile",
            tabBarIcon: ({ focused }: { focused: boolean }) => (
              <Feather
                name="user"
                size={22}
                color={focused ? "#0B7B72" : "#8A8A8A"}
              />
            ),
          } as any
        }
      />
    </Tab.Navigator>
  );
}

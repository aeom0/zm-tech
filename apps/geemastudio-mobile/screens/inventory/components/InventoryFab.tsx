import React from "react";
import { Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Colors } from "@/constants/theme";

import { inventoryStyles as styles } from "../inventoryStyles";

interface InventoryFabProps {
  onPress: () => void;
}

export function InventoryFab({ onPress }: InventoryFabProps) {
  return (
    <Pressable
      style={[styles.fab, { backgroundColor: Colors.light.violet }]}
      onPress={onPress}
    >
      <Feather name="plus" size={24} color={Colors.light.white} />
    </Pressable>
  );
}

import React from "react";
import { Pressable, View } from "react-native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

import { CATEGORY_LABELS, INVENTORY_CATEGORIES } from "../constants";
import type { InventoryCategory } from "../types";
import { inventoryStyles as styles } from "../inventoryStyles";

interface InventoryCategoryTabsProps {
  selectedTab: InventoryCategory;
  onSelect: (cat: InventoryCategory) => void;
  headerPaddingTop: number;
  theme: {
    primary: string;
    backgroundSecondary: string;
    text: string;
  };
}

export function InventoryCategoryTabs({
  selectedTab,
  onSelect,
  headerPaddingTop,
  theme,
}: InventoryCategoryTabsProps) {
  return (
    <View
      style={[styles.tabBar, { paddingTop: headerPaddingTop + Spacing.sm }]}
    >
      {INVENTORY_CATEGORIES.map((cat) => (
        <Pressable
          key={cat}
          style={[
            styles.tab,
            {
              backgroundColor:
                selectedTab === cat ? theme.primary : theme.backgroundSecondary,
            },
          ]}
          onPress={() => {
            onSelect(cat);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <ThemedText
            style={[
              styles.tabText,
              { color: selectedTab === cat ? "#FFFFFF" : theme.text },
            ]}
          >
            {CATEGORY_LABELS[cat]}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

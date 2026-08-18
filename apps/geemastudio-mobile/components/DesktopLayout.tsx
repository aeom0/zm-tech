import React from 'react'
import { View, StyleSheet, ScrollView, Platform, type DimensionValue } from 'react-native'
import { useResponsive } from '../hooks/useResponsive'
import { useTheme } from '../hooks/useTheme'

interface DesktopLayoutProps {
  sidebar?: React.ReactNode
  children: React.ReactNode
  header?: React.ReactNode
}

export function DesktopLayout({ sidebar, children, header }: DesktopLayoutProps) {
  const { isDesktop, isWide } = useResponsive()
  const { theme } = useTheme()

  // En móvil/tablet, renderizar solo el contenido principal
  if (!isDesktop) {
    return <>{children}</>
  }

  const sidebarWidth = isWide ? 280 : 240

  return (
    <View style={styles.container}>
      {/* Header (opcional) */}
      {header && (
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
        >
          {header}
        </View>
      )}

      <View style={styles.body}>
        {/* Sidebar */}
        {sidebar && (
          <View
            style={[
              styles.sidebar,
              {
                width: sidebarWidth,
                backgroundColor: theme.card,
                borderRightColor: theme.border,
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sidebarContent}
            >
              {sidebar}
            </ScrollView>
          </View>
        )}

        {/* Main Content */}
        <View style={styles.main}>
          <ScrollView
            showsVerticalScrollIndicator={Platform.OS === 'web'}
            contentContainerStyle={styles.mainContent}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web' ? { height: '100vh' as DimensionValue } : {}),
  },
  header: {
    height: 64,
    borderBottomWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        zIndex: 10,
      },
    }),
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    borderRightWidth: 1,
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 64,
        height: 'calc(100vh - 64px)' as DimensionValue,
        overflowY: 'auto' as any,
      },
    }),
  },
  sidebarContent: {
    padding: 16,
  },
  main: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  mainContent: {
    padding: 24,
    minHeight: '100%',
  },
})

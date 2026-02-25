import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

export default function TabsLayout() {
    const { t } = useTranslation();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: "#0C0C14",
                    borderTopColor: "rgba(255,255,255,0.06)",
                    borderTopWidth: 0.5,
                    height: 85,
                    paddingBottom: 28,
                    paddingTop: 8,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarActiveTintColor: "#10B981",
                tabBarInactiveTintColor: "#4B5563",
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                    letterSpacing: 0.2,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t("tabs.home"),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "home" : "home-outline"}
                            size={22}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="accounts"
                options={{
                    title: t("tabs.accounts"),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "card" : "card-outline"}
                            size={22}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="analytics"
                options={{
                    title: t("tabs.analytics"),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "stats-chart" : "stats-chart-outline"}
                            size={22}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="advisor"
                options={{
                    title: t("tabs.advisor"),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={
                                focused
                                    ? "chatbubble-ellipses"
                                    : "chatbubble-ellipses-outline"
                            }
                            size={22}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: t("tabs.profile"),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "person" : "person-outline"}
                            size={22}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}

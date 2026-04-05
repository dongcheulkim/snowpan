import { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { registerPushToken, addNotificationResponseListener } from './src/utils/push';

import HomeScreen from './src/screens/HomeScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import SearchScreen from './src/screens/SearchScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import MyPageScreen from './src/screens/MyPageScreen';
import LoginScreen from './src/screens/LoginScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>{icon}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6, backgroundColor: '#fff', borderTopColor: '#BAE6FD' },
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="홈" component={HomeScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} /> }} />
      <Tab.Screen name="커뮤니티" component={CommunityScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon icon="💬" focused={focused} /> }} />
      <Tab.Screen name="검색" component={SearchScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🔍" focused={focused} /> }} />
      <Tab.Screen name="채팅" component={ChatListScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon icon="💭" focused={focused} /> }} />
      <Tab.Screen name="MY" component={MyPageScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const navRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    // 푸시 토큰 등록
    registerPushToken().catch(() => {});

    // 알림 클릭 시 해당 화면으로 이동
    const sub = addNotificationResponseListener(response => {
      const link = response.notification.request.content.data?.link as string;
      if (link && navRef.current) {
        if (link.startsWith('/chat/')) navRef.current.navigate('채팅');
        else if (link.startsWith('/community/')) navRef.current.navigate('커뮤니티');
        else if (link.startsWith('/used/')) navRef.current.navigate('홈');
        else navRef.current.navigate('홈');
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <NavigationContainer ref={navRef}>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

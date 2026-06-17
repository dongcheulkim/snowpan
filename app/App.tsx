import { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { registerPushToken, addNotificationResponseListener } from './src/utils/push';
// 백그라운드 위치 작업 등록 — 모듈 import 만으로 TaskManager.defineTask 실행.
import './src/utils/snowRunTracker';

// 탭 화면
import HomeScreen from './src/screens/HomeScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import SearchScreen from './src/screens/SearchScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import MyPageScreen from './src/screens/MyPageScreen';

// 스택 화면
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import UsedListScreen from './src/screens/UsedListScreen';
import UsedDetailScreen from './src/screens/UsedDetailScreen';
import UsedRegisterScreen from './src/screens/UsedRegisterScreen';
import ChatScreen from './src/screens/ChatScreen';
import CommunityDetailScreen from './src/screens/CommunityDetailScreen';
import CommunityWriteScreen from './src/screens/CommunityWriteScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import RentalListScreen from './src/screens/RentalListScreen';
import LessonListScreen from './src/screens/LessonListScreen';
import AccommodationListScreen from './src/screens/AccommodationListScreen';
import SkiShopScreen from './src/screens/SkiShopScreen';
import RepairShopScreen from './src/screens/RepairShopScreen';
import CompetitionsScreen from './src/screens/CompetitionsScreen';
import MySalesScreen from './src/screens/MySalesScreen';
import MyWishlistScreen from './src/screens/MyWishlistScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import SellerProfileScreen from './src/screens/SellerProfileScreen';
import AdBookingScreen from './src/screens/AdBookingScreen';
import SnowRunScreen from './src/screens/SnowRunScreen';
import SnowRunDetailScreen from './src/screens/SnowRunDetailScreen';
import SnowRunShareScreen from './src/screens/SnowRunShareScreen';
import PointsScreen from './src/screens/PointsScreen';
import CouponShopScreen from './src/screens/CouponShopScreen';
import MyCouponsScreen from './src/screens/MyCouponsScreen';

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
    registerPushToken().catch(() => {});
    const sub = addNotificationResponseListener(response => {
      const link = response.notification.request.content.data?.link as string;
      if (link && navRef.current) {
        if (link.startsWith('/chat/')) navRef.current.navigate('채팅');
        else if (link.startsWith('/community/')) navRef.current.navigate('커뮤니티');
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
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Used" component={UsedListScreen} />
        <Stack.Screen name="UsedDetail" component={UsedDetailScreen} />
        <Stack.Screen name="UsedRegister" component={UsedRegisterScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="CommunityDetail" component={CommunityDetailScreen} />
        <Stack.Screen name="CommunityWrite" component={CommunityWriteScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Rental" component={RentalListScreen} />
        <Stack.Screen name="Lesson" component={LessonListScreen} />
        <Stack.Screen name="Accommodation" component={AccommodationListScreen} />
        <Stack.Screen name="SkiShop" component={SkiShopScreen} />
        <Stack.Screen name="Repair" component={RepairShopScreen} />
        <Stack.Screen name="Competitions" component={CompetitionsScreen} />
        <Stack.Screen name="MySales" component={MySalesScreen} />
        <Stack.Screen name="MyWishlist" component={MyWishlistScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="SellerProfile" component={SellerProfileScreen} />
        <Stack.Screen name="AdBooking" component={AdBookingScreen} />
        <Stack.Screen name="SnowRun" component={SnowRunScreen} options={{ headerShown: true, title: '스노우런' }} />
        <Stack.Screen name="SnowRunDetail" component={SnowRunDetailScreen} options={{ headerShown: true, title: '런 상세' }} />
        <Stack.Screen name="SnowRunShare" component={SnowRunShareScreen} options={{ headerShown: true, title: '공유 카드' }} />
        <Stack.Screen name="Points" component={PointsScreen} options={{ headerShown: true, title: '내 포인트' }} />
        <Stack.Screen name="CouponShop" component={CouponShopScreen} options={{ headerShown: true, title: '쿠폰샵' }} />
        <Stack.Screen name="MyCoupons" component={MyCouponsScreen} options={{ headerShown: true, title: '내 쿠폰' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

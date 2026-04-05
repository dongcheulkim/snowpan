import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { getUser, logout } from '../utils/api';

export default function MyPageScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getUser().then(u => {
      if (!u) navigation.navigate('Login');
      else setUser(u);
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  if (!user) return null;

  const menuItems = [
    { label: '프로필 수정', screen: 'EditProfile' },
    { label: '판매 내역', screen: 'MySales' },
    { label: '찜 목록', screen: 'MyWishlist' },
    { label: '내 스키샵/정비샵', screen: 'MyShops' },
    { label: '알림', screen: 'Notifications' },
    { label: '이용약관', screen: 'Terms' },
    { label: '개인정보처리방침', screen: 'Privacy' },
    { label: '안전거래 가이드', screen: 'SafeTrade' },
    { label: '고객센터', screen: 'Support' },
  ];

  return (
    <ScrollView style={s.container}>
      {/* 프로필 */}
      <View style={s.profile}>
        <View style={s.avatar}><Text style={{ fontSize: 28 }}>👤</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{user.nickname || user.name}</Text>
          <Text style={s.email}>{user.email}</Text>
        </View>
      </View>

      {/* 메뉴 */}
      <View style={s.menu}>
        {menuItems.map((item, idx) => (
          <TouchableOpacity key={item.screen} style={[s.menuItem, idx < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }]} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.7}>
            <Text style={s.menuLabel}>{item.label}</Text>
            <Text style={s.menuArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 관리자 */}
      {user.role === 'admin' && (
        <View style={[s.menu, { marginTop: 12 }]}>
          <TouchableOpacity style={s.menuItem} onPress={() => navigation.navigate('AdminApproval')}>
            <Text style={[s.menuLabel, { color: '#F43F5E' }]}>관리자 승인</Text>
            <Text style={s.menuArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.menuItem, { borderTopWidth: 1, borderTopColor: '#f1f5f9' }]} onPress={() => navigation.navigate('AdminDashboard')}>
            <Text style={[s.menuLabel, { color: '#F43F5E' }]}>관리자 대시보드</Text>
            <Text style={s.menuArrow}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 로그아웃 */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={s.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  profile: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', margin: 16, borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  email: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  menu: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  menuLabel: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  menuArrow: { fontSize: 12, color: '#9ca3af' },
  logoutBtn: { marginHorizontal: 16, marginTop: 16, paddingVertical: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  logoutText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
});

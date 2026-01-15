// MessagePage.tsx (Fixed & Optimized for Latest Offer → quotations)

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ListRenderItemInfo,
} from 'react-native';
import io, { Socket } from 'socket.io-client';
import Header from '../Header/Header';
import { navigate } from '../../Navigation/CustomNavigation';
import { useId } from '../../context/UserContex';
import api, { BASE_URL, localApiUrl, localServerUrl } from '../Api/Api';

const UPLOADS_BASE_URL = BASE_URL;

/* -------------------- Utility helpers -------------------- */
const sanitizeUrl = (url: string) => url.replace(/([^:]\/)\/+/g, '$1');
const getAvatar = (avatarPath: string | undefined, name: string) => {
  if (avatarPath) {
    const path = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
    return sanitizeUrl(`${UPLOADS_BASE_URL}${path}`);
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || 'U'
  )}&background=random`;
};
const safeDate = (val: any): Date | null => {
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};
const formatDateLabel = (isoOrDate?: string | number | Date) => {
  const d = safeDate(isoOrDate);
  if (!d) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
};
const toTimeValue = (t?: string | number | Date) => {
  const d = safeDate(t);
  return d ? d.getTime() : 0;
};

/* -------------------- Amount & Status Parsing (Same as before) -------------------- */
// ... (tumhare saare parsing functions same hi rakh raha hoon - parseNegotiateAmount, parseActiveStatus, extractNumbersFromString etc.)
// Yeh part unchanged hai - copy-paste kar lena from your code

/* -------------------- Types -------------------- */
type TUserItem = {
  id: string | number;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  lastMessage?: string;
  time?: string | number | Date;
  unreadCount?: number;
  activeStatus?: 'accept' | 'negotiate' | 'none';
  negotiateAmount?: number;
};
type RawChatEntry = {
  chatWith: string;
  lastMessage?: string;
  time?: string | number | Date;
  timestamp?: string | number | Date;
  activeStatus?: string;
  negotiateAmount?: number;
};

/* -------------------- Memoized Row (Same logic) -------------------- */
const MessageItem = memo(
  ({ item, onPress }: { item: TUserItem; onPress: (itm: TUserItem) => void }) => {
    const avatarUri = getAvatar(item.avatar, item.name);
    let subtitle = item.lastMessage || 'No message yet';
    const status = (item.activeStatus || 'none').toLowerCase();
    const amount = Number(item.negotiateAmount || 0);

    let extraLabel = '';
    if (status === 'accept') {
      extraLabel = 'Accept';
    } else if (status === 'negotiate' || amount > 0) {
      extraLabel = amount > 0 ? `Negotiate ₹${amount}` : 'Negotiate';
    }

    if (extraLabel) {
      subtitle = `${subtitle ? subtitle + ' · ' : ''}${extraLabel}`;
    }

    return (
      <TouchableOpacity style={styles.messageItem} onPress={() => onPress(item)}>
        <View>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          {item.isOnline ? <View style={styles.activeDot} /> : null}
        </View>
        <View style={styles.messageContent}>
          <View style={styles.messageHeader}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name || 'Unknown'}
            </Text>
            <Text style={styles.time}>{formatDateLabel(item?.time)}</Text>
          </View>
          <View style={styles.messageFooter}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {subtitle}
            </Text>
            {!!item.unreadCount && item.unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) => {
    const a = prev.item;
    const b = next.item;
    return (
      a.id === b.id &&
      a.name === b.name &&
      a.avatar === b.avatar &&
      !!a.isOnline === !!b.isOnline &&
      a.lastMessage === b.lastMessage &&
      toTimeValue(a.time) === toTimeValue(b.time) &&
      (a.unreadCount || 0) === (b.unreadCount || 0) &&
      (a.activeStatus || 'none') === (b.activeStatus || 'none') &&
      (a.negotiateAmount || 0) === (b.negotiateAmount || 0)
    );
  }
);

/* -------------------- Main Component -------------------- */
const ROW_HEIGHT = 76;
const MessagePage: React.FC = () => {
  const [rawChatUsers, setRawChatUsers] = useState<RawChatEntry[]>([]);
  const [rawUserArray, setRawUserArray] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { id } = useId();
  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(true);

  const users: TUserItem[] = useMemo(() => {
    const list = rawChatUsers.map((chatItem) => {
      const matched = rawUserArray.find(
        (u) => u?.partner?.user_id === chatItem?.chatWith
      );

      const amount = Number(chatItem?.negotiateAmount || 0);
      const status = chatItem?.activeStatus || (amount > 0 ? 'negotiate' : 'none');

      return {
        id: chatItem.chatWith,
        name: matched?.partner?.fullname || 'Unknown',
        avatar: matched?.partner?.profilepic || '',
        isOnline: !!matched?.partner?.isOnline,
        lastMessage: chatItem.lastMessage || '',
        time: chatItem.time || chatItem.timestamp || Date.now(),
        unreadCount: unreadCounts?.[chatItem.chatWith] || 0,
        activeStatus: status,
        negotiateAmount: amount,
      } as TUserItem;
    });

    list.sort((a, b) => toTimeValue(b.time) - toTimeValue(a.time));
    return list;
  }, [rawChatUsers, rawUserArray, unreadCounts]);

  /* ==================== Load Initial Data ==================== */
  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      if (!refreshing) setIsLoading(true);

      const userRes = await api.get('/getuser.php', {
        headers: { 'Cache-Control': 'no-cache' },
      });

      const users = Array.isArray(userRes?.data?.data) ? userRes.data.data : [];
      if (users.length === 0) return;

      const [chatUsersRes, unreadCountsRes] = await Promise.all([
        api.post(`https://railwayexam.info/chatUsers`, { userId: id }).catch(() => ({ data: [] })),
        api.post(`https://railwayexam.info/unreadCounts`, { userId: id }).catch(() => ({ data: {} })),
      ]);

      const chatUsers = (Array.isArray(chatUsersRes?.data) ? chatUsersRes.data : []).map((c: any) => {
        const parsedAmount = parseNegotiateAmount(c);
        const inferredStatus = parseActiveStatus(c, c.lastMessage ?? '');

        return {
          chatWith: String(c.chatWith ?? c.from ?? c.to ?? ''),
          lastMessage: c.lastMessage ?? c.message ?? c.text ?? '',
          time: c.time ?? c.timestamp ?? new Date().toISOString(),
          timestamp: c.timestamp ?? c.time ?? new Date().toISOString(),
          activeStatus: inferredStatus !== 'none' ? inferredStatus : (parsedAmount > 0 ? 'negotiate' : 'none'),
          negotiateAmount: parsedAmount,
        } as RawChatEntry;
      });

      if (mountedRef.current) {
        setRawUserArray(users);
        setRawChatUsers(chatUsers);
        setUnreadCounts(unreadCountsRes?.data || {});
      }
    } catch (err) {
      console.log('Load data error:', err);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, [id, refreshing]);

  /* ==================== Socket Setup ==================== */
  useEffect(() => {
    mountedRef.current = true;
    const s = io(localServerUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 6,
    });
    socketRef.current = s;

    s.on('connect', () => {
      if (id) s.emit('join', { userId: id });
      loadData();
    });

    s.on('receive_message', (message: any) => {
      try {
        const senderId = message?.senderId ?? message?.sender ?? message?.from;
        const receiverId = message?.receiverId ?? message?.receiver ?? message?.to;
        const chatWith = String(senderId === id ? receiverId : senderId);

        const parsedAmount = parseNegotiateAmount(message);
        const lastMessageText = message?.text ?? message?.message ?? 'Attachment';
        const activeStatus = parseActiveStatus(message, lastMessageText);
        const timeVal = message?.timestamp ?? message?.time ?? new Date().toISOString();

        setRawChatUsers((prev) => {
          const idx = prev.findIndex((c) => String(c.chatWith) === chatWith);
          const newEntry: RawChatEntry = {
            chatWith,
            lastMessage: lastMessageText,
            time: timeVal,
            timestamp: timeVal,
            activeStatus: activeStatus !== 'none' ? activeStatus : (parsedAmount > 0 ? 'negotiate' : 'none'),
            negotiateAmount: parsedAmount,
          };

          const next = [...prev];
          if (idx !== -1) {
            next[idx] = { ...next[idx], ...newEntry };
          } else {
            next.unshift(newEntry);
          }
          return next.sort((a, b) => toTimeValue(b.time) - toTimeValue(a.time));
        });

        if (String(receiverId) === String(id)) {
          setUnreadCounts((prev) => ({
            ...prev,
            [String(senderId)]: (prev[String(senderId)] || 0) + 1,
          }));
        }
      } catch (e) {
        console.log('Socket message error:', e);
      }
    });

    s.on('unread_count_update', ({ userId: targetId, from, count }: any) => {
      if (String(targetId) === String(id)) {
        setUnreadCounts((prev) => ({ ...prev, [String(from)]: Number(count || 0) }));
      }
    });

    return () => {
      mountedRef.current = false;
      s.disconnect();
      socketRef.current = null;
    };
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ==================== Navigation with LATEST OFFER ==================== */
  const handlePressItem = useCallback((item: TUserItem) => {
    // Get latest data from rawChatUsers (most up-to-date)
    const latestChat = rawChatUsers.find(c => String(c.chatWith) === String(item.id));
    const latestAmount = latestChat ? Number(latestChat.negotiateAmount || 0) : 0;
    const latestStatus = latestChat?.activeStatus || 'none';

    const hasAccept = latestStatus === 'accept' || (item.lastMessage || '').toLowerCase().includes('accept');
    const finalStatus = hasAccept ? 'accept' : (latestAmount > 0 ? 'negotiate' : 'none');

    navigate('MessageScreen', {
      bidderId: item.id,
      name: item.name,
      image: getAvatar(item.avatar || '', item.name),
      quotations: latestAmount,           // ← Yeh raha tumhara "My new offer"
      Status: finalStatus,
      chatStatus: false,
    });
  }, [rawChatUsers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const keyExtractor = useCallback((item: TUserItem) => String(item.id), []);
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TUserItem>) => (
      <MessageItem item={item} onPress={handlePressItem} />
    ),
    [handlePressItem]
  );

  return (
    <View style={styles.container}>
      <Header hide />
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No chats found</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
          initialNumToRender={12}
          windowSize={11}
          maxToRenderPerBatch={20}
          removeClippedSubviews
          contentContainerStyle={{ paddingBottom: 12 }}
        />
      )}
    </View>
  );
};

/* Styles same as before */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  messageItem: { flexDirection: 'row', alignItems: 'center', padding: 15, height: ROW_HEIGHT },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#e1e1e1' },
  activeDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'limegreen', position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: '#fff' },
  messageContent: { flex: 1 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '600', maxWidth: '75%' },
  time: { fontSize: 12, color: '#666' },
  lastMessage: { fontSize: 14, color: '#666', flex: 1 },
  unreadBadge: { backgroundColor: 'red', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 10, minWidth: 24, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  separator: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 80 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
  loadingContainer: { marginTop: 100, alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#888' },
});

export default MessagePage;
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './src/firebase';
import type {
  ChatTarget,
  VoxChannel,
  VoxFriend,
  VoxGroup,
  VoxMessage,
  VoxProfile,
  VoxServer,
} from './src/types';

const COLORS = {
  background: '#080C17',
  panel: '#11192A',
  panelRaised: '#172238',
  panelSoft: '#1C2941',
  border: '#263752',
  cyan: '#31DDF7',
  cyanDark: '#0D7892',
  purple: '#B17AF5',
  text: '#F2F6FF',
  muted: '#A2B0C6',
  quiet: '#72829C',
  green: '#47D6A3',
  danger: '#FF718B',
  white: '#FFFFFF',
};

function roomId(uidA: string, uidB: string) {
  return uidA < uidB ? `dm_${uidA}_${uidB}` : `dm_${uidB}_${uidA}`;
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String(error.code);
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Those sign-in details were not recognised.';
    }
    if (code === 'auth/email-already-in-use') return 'That email already has a VOX account.';
    if (code === 'auth/weak-password') return 'Choose a password with at least 6 characters.';
    if (code === 'auth/network-request-failed') return 'Network error. Check your internet connection.';
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function AppRoot() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  if (!authReady) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.brandWord}>VOX</Text>
        <ActivityIndicator color={COLORS.cyan} size="large" />
        <Text style={styles.mutedText}>Connecting securely…</Text>
      </View>
    );
  }

  return user ? <HomeScreen key={user.uid} user={user} /> : <AuthScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <AppRoot />
    </SafeAreaProvider>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loginValue, setLoginValue] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    const value = loginValue.trim();
    if (!value || !password) {
      setError('Enter your email or username and password.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      let signInEmail = value;
      if (!value.includes('@')) {
        const usernameQuery = query(
          collection(db, 'vox_users'),
          where('username', '==', value.toLowerCase()),
          limit(1),
        );
        const snapshot = await getDocs(usernameQuery);
        if (snapshot.empty) {
          throw new Error('We could not find that username. Check it and try again.');
        }
        signInEmail = String(snapshot.docs[0].data().email || '');
        if (!signInEmail) {
          throw new Error('This account needs an email-address sign-in. Try the email used when it was created.');
        }
      }
      await signInWithEmailAndPassword(auth, signInEmail, password);
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup() {
    const cleanEmail = email.trim();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanEmail || !cleanUsername || !password || !confirmPassword) {
      setError('Fill in every field to create your account.');
      return;
    }
    if (cleanUsername.length < 3 || !/^[a-z0-9_]+$/.test(cleanUsername)) {
      setError('Username must be 3+ characters and use only letters, numbers, or underscores.');
      return;
    }
    if (password.length < 6) {
      setError('Password must have at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const usernameQuery = query(
        collection(db, 'vox_users'),
        where('username', '==', cleanUsername),
        limit(1),
      );
      const duplicate = await getDocs(usernameQuery);
      if (!duplicate.empty) throw new Error('That username is already taken.');

      const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      await setDoc(doc(db, 'vox_users', credential.user.uid), {
        displayName: username.trim(),
        username: cleanUsername,
        email: cleanEmail,
        photoURL: '',
        bio: '',
        socials: { yt: '', discord: '' },
        friends: [],
        friendRequests: [],
        blockedUsers: [],
      });
    } catch (signupError) {
      setError(getErrorMessage(signupError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeRoot}>
      <KeyboardAvoidingView
        style={styles.authKeyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.authScroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.authBrand}>
            <View style={styles.logoTile}><Text style={styles.logoLetter}>V</Text></View>
            <Text style={styles.brandWord}>VOX</Text>
            <Text style={styles.authTagline}>YOUR PEOPLE. YOUR SPACE.</Text>
            <Text style={styles.authIntro}>A faster, native chat experience.</Text>
          </View>

          <View style={styles.authCard}>
            <View style={styles.segmentRow}>
              <Pressable
                style={[styles.segmentButton, mode === 'login' && styles.segmentActive]}
                onPress={() => { setMode('login'); setError(''); }}
              >
                <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>Log in</Text>
              </Pressable>
              <Pressable
                style={[styles.segmentButton, mode === 'signup' && styles.segmentActive]}
                onPress={() => { setMode('signup'); setError(''); }}
              >
                <Text style={[styles.segmentText, mode === 'signup' && styles.segmentTextActive]}>Sign up</Text>
              </Pressable>
            </View>

            <Text style={styles.formTitle}>{mode === 'login' ? 'Welcome back' : 'Create your VOX account'}</Text>
            {mode === 'login' ? (
              <>
                <Text style={styles.fieldLabel}>EMAIL OR USERNAME</Text>
                <TextInput
                  value={loginValue}
                  onChangeText={setLoginValue}
                  placeholder="you@example.com or username"
                  placeholderTextColor={COLORS.quiet}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="username"
                  style={styles.input}
                />
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>EMAIL</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.quiet}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  style={styles.input}
                />
                <Text style={styles.fieldLabel}>USERNAME</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="your_vox_name"
                  placeholderTextColor={COLORS.quiet}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </>
            )}

            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={COLORS.quiet}
              secureTextEntry
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={styles.input}
              onSubmitEditing={mode === 'login' ? handleLogin : undefined}
              returnKeyType={mode === 'login' ? 'go' : 'next'}
            />
            {mode === 'signup' && (
              <>
                <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Type it again"
                  placeholderTextColor={COLORS.quiet}
                  secureTextEntry
                  autoComplete="new-password"
                  style={styles.input}
                  onSubmitEditing={handleSignup}
                  returnKeyType="go"
                />
              </>
            )}

            {!!error && <Text style={styles.errorText}>{error}</Text>}
            <Pressable
              style={[styles.primaryButton, busy && styles.buttonDisabled]}
              disabled={busy}
              onPress={mode === 'login' ? handleLogin : handleSignup}
            >
              {busy ? <ActivityIndicator color={COLORS.background} /> : (
                <Text style={styles.primaryButtonText}>{mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}</Text>
              )}
            </Pressable>
            <Text style={styles.authFootnote}>
              VOX Mobile uses the existing VOX account and Firebase data.
            </Text>
            <Text style={styles.authFootnoteMuted}>
              Google sign-in and account recovery need their native app configuration before release.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type ListMode = 'friends' | 'servers' | 'groups';

function HomeScreen({ user }: { user: User }) {
  const { width } = useWindowDimensions();
  const isTabletLayout = width >= 820;

  const [profile, setProfile] = useState<VoxProfile>({});
  const [friends, setFriends] = useState<VoxFriend[]>([]);
  const [servers, setServers] = useState<VoxServer[]>([]);
  const [groups, setGroups] = useState<VoxGroup[]>([]);
  const [listMode, setListMode] = useState<ListMode>('friends');
  const [expandedServerId, setExpandedServerId] = useState<string | null>(null);
  const [channels, setChannels] = useState<VoxChannel[]>([]);
  const [selected, setSelected] = useState<ChatTarget | null>(null);
  const [messages, setMessages] = useState<VoxMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const profileRef = doc(db, 'vox_users', user.uid);
    return onSnapshot(profileRef, async (snapshot) => {
      const data = (snapshot.data() || {}) as VoxProfile;
      setProfile(data);
      setProfileLoading(false);

      const blocked = new Set(data.blockedUsers || []);
      const friendIds = [...new Set(data.friends || [])]
        .filter((uid) => uid !== user.uid && !blocked.has(uid));

      try {
        const results = await Promise.all(friendIds.map(async (uid) => {
          const friendSnapshot = await getDoc(doc(db, 'vox_users', uid));
          if (!friendSnapshot.exists()) return null;
          const friend = friendSnapshot.data() as VoxProfile;
          if (!(friend.friends || []).includes(user.uid)) return null;
          if ((friend.blockedUsers || []).includes(user.uid)) return null;
          return { uid, ...friend } as VoxFriend;
        }));
        setFriends(results.filter((item): item is VoxFriend => item !== null));
      } catch (error) {
        console.warn('Could not load VOX friends:', error);
      }
    }, (error) => {
      setProfileLoading(false);
      setChatError(error.message);
    });
  }, [user.uid]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'vox_servers'), (snapshot) => {
      setServers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as VoxServer)));
    }, (error) => setChatError(error.message));

    const groupsQuery = query(
      collection(db, 'vox_groups'),
      where('members', 'array-contains', user.uid),
    );
    const unsubscribeGroups = onSnapshot(groupsQuery, (snapshot) => {
      setGroups(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as VoxGroup)));
    }, (error) => setChatError(error.message));

    return () => {
      unsubscribe();
      unsubscribeGroups();
    };
  }, [user.uid]);

  useEffect(() => {
    if (!expandedServerId) {
      setChannels([]);
      return;
    }
    const channelQuery = query(
      collection(db, 'vox_channels'),
      where('serverId', '==', expandedServerId),
    );
    return onSnapshot(channelQuery, (snapshot) => {
      const next = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() } as VoxChannel))
        .sort((a, b) => {
          const left = (a as any).createdAt?.seconds || 0;
          const right = (b as any).createdAt?.seconds || 0;
          return left - right;
        });
      setChannels(next);
    }, (error) => setChatError(error.message));
  }, [expandedServerId]);

  useEffect(() => {
    if (!selected || (selected.kind === 'channel' && selected.channelType === 'voice')) {
      setMessages([]);
      return;
    }

    let baseQuery;
    if (selected.kind === 'dm') {
      baseQuery = query(collection(db, 'vox_messages'), where('dmId', '==', selected.roomKey));
    } else if (selected.kind === 'group') {
      baseQuery = query(collection(db, 'vox_messages'), where('groupId', '==', selected.id));
    } else {
      baseQuery = query(
        collection(db, 'vox_messages'),
        where('serverId', '==', selected.serverId),
        where('channel', '==', selected.id),
      );
    }

    const messagesQuery = query(baseQuery, orderBy('timestamp', 'desc'), limit(50));
    setChatError('');
    return onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      } as VoxMessage)));
    }, (error) => setChatError(error.message));
  }, [selected?.kind, selected?.id, selected?.roomKey, selected?.serverId, selected?.channelType]);

  const visibleFriends = useMemo(() => friends, [friends]);

  function openFriend(friend: VoxFriend) {
    setSelected({
      kind: 'dm',
      id: friend.uid,
      title: friend.displayName || friend.username || 'Direct message',
      roomKey: roomId(user.uid, friend.uid),
    });
  }

  function openGroup(group: VoxGroup) {
    setSelected({
      kind: 'group',
      id: group.id,
      title: group.name || 'Group',
      roomKey: `group_${group.id}`,
    });
  }

  function openChannel(channel: VoxChannel) {
    if (!channel.serverId) return;
    setSelected({
      kind: 'channel',
      id: channel.id,
      serverId: channel.serverId,
      title: channel.name || 'Channel',
      channelType: channel.type || 'text',
      roomKey: `server_${channel.serverId}_${channel.id}`,
    });
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || !selected || sending) return;
    if (selected.kind === 'channel' && selected.channelType === 'voice') return;

    setDraft('');
    setSending(true);
    setChatError('');
    try {
      const payload: Record<string, unknown> = {
        senderUid: user.uid,
        sender: profile.displayName || user.displayName || 'Voxer',
        senderPhoto: profile.photoURL || user.photoURL || '',
        timestamp: serverTimestamp(),
        text,
      };

      if (selected.kind === 'dm') {
        const mutual = visibleFriends.some((friend) => friend.uid === selected.id);
        if (!mutual) throw new Error('You can only message accepted mutual friends.');
        payload.dmId = selected.roomKey;
        payload.dmMembers = [user.uid, selected.id].sort();
      } else if (selected.kind === 'group') {
        payload.groupId = selected.id;
      } else {
        payload.serverId = selected.serverId;
        payload.channel = selected.id;
      }

      await addDoc(collection(db, 'vox_messages'), payload);
    } catch (error) {
      setDraft(text);
      setChatError(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  }

  const sidebar = (
    <View style={[styles.sidebar, isTabletLayout && styles.sidebarTablet]}>
      <View style={styles.listModeRow}>
        {(['friends', 'servers', 'groups'] as ListMode[]).map((mode) => (
          <Pressable
            key={mode}
            onPress={() => setListMode(mode)}
            style={[styles.listModeButton, listMode === mode && styles.listModeActive]}
          >
            <Text style={[styles.listModeText, listMode === mode && styles.listModeTextActive]}>
              {mode === 'friends' ? 'Friends' : mode === 'servers' ? 'Servers' : 'Groups'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.sidebarScroll}>
        {listMode === 'friends' && (
          <>
            <Text style={styles.sectionCaption}>MUTUAL FRIENDS · {visibleFriends.length}</Text>
            {profileLoading ? <ActivityIndicator color={COLORS.cyan} /> : visibleFriends.length === 0 ? (
              <EmptyList
                title="Your friend list is quiet"
                body="Accepted mutual friends from your existing VOX account will show up here."
              />
            ) : visibleFriends.map((friend) => (
              <Pressable
                key={friend.uid}
                style={[
                  styles.personRow,
                  selected?.kind === 'dm' && selected.id === friend.uid && styles.rowActive,
                ]}
                onPress={() => openFriend(friend)}
              >
                <View style={styles.avatar}><Text style={styles.avatarText}>{(friend.displayName || friend.username || '?').slice(0, 1).toUpperCase()}</Text></View>
                <View style={styles.personCopy}>
                  <Text numberOfLines={1} style={styles.rowTitle}>{friend.displayName || friend.username || 'VOX friend'}</Text>
                  <Text numberOfLines={1} style={styles.rowSubtitle}>@{friend.username || 'voxer'}</Text>
                </View>
                <View style={styles.onlineDot} />
              </Pressable>
            ))}
          </>
        )}

        {listMode === 'groups' && (
          <>
            <Text style={styles.sectionCaption}>YOUR GROUPS · {groups.length}</Text>
            {groups.length === 0 ? (
              <EmptyList title="No groups yet" body="Groups you already belong to on VOX will appear here." />
            ) : groups.map((group) => (
              <Pressable
                key={group.id}
                style={[styles.listRow, selected?.kind === 'group' && selected.id === group.id && styles.rowActive]}
                onPress={() => openGroup(group)}
              >
                <View style={[styles.smallIcon, styles.groupIcon]}><Text style={styles.smallIconText}>G</Text></View>
                <Text numberOfLines={1} style={styles.rowTitle}>{group.name || 'Group chat'}</Text>
              </Pressable>
            ))}
          </>
        )}

        {listMode === 'servers' && (
          <>
            <Text style={styles.sectionCaption}>SERVERS · {servers.length}</Text>
            {servers.length === 0 ? (
              <EmptyList title="No servers available" body="Servers from your existing VOX account will appear here." />
            ) : servers.map((server) => {
              const expanded = expandedServerId === server.id;
              return (
                <View key={server.id}>
                  <Pressable
                    style={[styles.listRow, expanded && styles.rowActive]}
                    onPress={() => setExpandedServerId(expanded ? null : server.id)}
                  >
                    <View style={styles.serverIcon}><Text style={styles.smallIconText}>{(server.name || 'V').slice(0, 1).toUpperCase()}</Text></View>
                    <Text numberOfLines={1} style={styles.rowTitle}>{server.name || 'VOX server'}</Text>
                    <Text style={styles.chevron}>{expanded ? '−' : '+'}</Text>
                  </Pressable>
                  {expanded && channels.map((channel) => (
                    <Pressable
                      key={channel.id}
                      style={[
                        styles.channelRow,
                        selected?.kind === 'channel' && selected.id === channel.id && styles.channelActive,
                      ]}
                      onPress={() => openChannel(channel)}
                    >
                      <Text style={styles.channelSymbol}>{channel.type === 'voice' ? '◖' : '#'}</Text>
                      <Text numberOfLines={1} style={styles.channelText}>{channel.name || 'channel'}</Text>
                    </Pressable>
                  ))}
                  {expanded && channels.length === 0 && (
                    <Text style={styles.noChannels}>No channels in this server yet.</Text>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
      <View style={styles.accountBar}>
        <View style={styles.accountAvatar}><Text style={styles.avatarText}>{(profile.displayName || user.email || 'V').slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.accountText}>
          <Text numberOfLines={1} style={styles.accountName}>{profile.displayName || 'VOX account'}</Text>
          <Text numberOfLines={1} style={styles.accountEmail}>{user.email || profile.username || ''}</Text>
        </View>
        <Pressable onPress={() => signOut(auth)} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Out</Text>
        </Pressable>
      </View>
    </View>
  );

  const chatPane = (
    <View style={styles.chatPane}>
      {selected ? (
        <>
          <View style={styles.chatHeader}>
            {!isTabletLayout && (
              <Pressable onPress={() => setSelected(null)} style={styles.backButton}>
                <Text style={styles.backButtonText}>‹</Text>
              </Pressable>
            )}
            <View style={styles.chatHeaderCopy}>
              <Text style={styles.chatTitle} numberOfLines={1}>{selected.title}</Text>
              <Text style={styles.chatSubtitle}>
                {selected.kind === 'dm' ? 'DIRECT MESSAGE' : selected.kind === 'group' ? 'GROUP CHAT' : selected.channelType === 'voice' ? 'VOICE CHANNEL' : 'SERVER CHANNEL'}
              </Text>
            </View>
            <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
          </View>

          {selected.kind === 'channel' && selected.channelType === 'voice' ? (
            <View style={styles.emptyChat}>
              <View style={[styles.emptyIcon, { backgroundColor: '#302044' }]}><Text style={styles.emptyIconText}>♫</Text></View>
              <Text style={styles.emptyTitle}>Voice channel</Text>
              <Text style={styles.emptyBody}>The native voice/video engine is the next mobile milestone. It will use VOX’s existing vox_calls signalling rooms.</Text>
            </View>
          ) : (
            <>
              <FlatList
                style={styles.messageList}
                contentContainerStyle={styles.messageListContent}
                data={messages}
                inverted
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.emptyChat}>
                    <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>V</Text></View>
                    <Text style={styles.emptyTitle}>Start the conversation</Text>
                    <Text style={styles.emptyBody}>Messages sent here appear in the same VOX chat on the website and desktop app.</Text>
                  </View>
                }
                renderItem={({ item }) => <MessageBubble message={item} own={item.senderUid === user.uid} />}
              />
              {!!chatError && <Text style={styles.inlineError}>{chatError}</Text>}
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.composer}>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    style={styles.composerInput}
                    placeholder="Message VOX…"
                    placeholderTextColor={COLORS.quiet}
                    multiline
                    maxLength={4000}
                    returnKeyType="default"
                  />
                  <Pressable
                    onPress={sendMessage}
                    disabled={!draft.trim() || sending}
                    style={[styles.sendButton, (!draft.trim() || sending) && styles.buttonDisabled]}
                  >
                    {sending ? <ActivityIndicator size="small" color={COLORS.background} /> : <Text style={styles.sendButtonText}>↑</Text>}
                  </Pressable>
                </View>
              </KeyboardAvoidingView>
            </>
          )}
        </>
      ) : (
        <View style={styles.emptyChat}>
          <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>V</Text></View>
          <Text style={styles.emptyTitle}>Welcome to VOX</Text>
          <Text style={styles.emptyBody}>Choose a friend, group, or channel to open a live conversation.</Text>
          <Text style={styles.tabletHint}>Your VOX conversations stay in sync across mobile, web, and desktop.</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeRoot} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.appShell}>
        <View style={styles.appHeader}>
          <View style={styles.headerBrand}>
            <View style={styles.headerLogo}><Text style={styles.headerLogoText}>V</Text></View>
            <Text style={styles.headerWord}>VOX</Text>
            <Text style={styles.headerTag}>MOBILE</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.connectedPill}><View style={styles.liveDot} /><Text style={styles.connectedText}>CONNECTED</Text></View>
          </View>
        </View>

        <View style={[styles.mainLayout, isTabletLayout && styles.mainLayoutTablet]}>
          {(isTabletLayout || !selected) && sidebar}
          {(isTabletLayout || !!selected) && chatPane}
        </View>
      </View>
    </SafeAreaView>
  );
}

function MessageBubble({ message, own }: { message: VoxMessage; own: boolean }) {
  const date = message.timestamp && typeof message.timestamp.toDate === 'function'
    ? message.timestamp.toDate()
    : null;
  const time = date
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'now';

  return (
    <View style={[styles.messageRow, own && styles.messageRowOwn]}>
      <View style={[styles.messageBubble, own ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
        {!own && <Text style={styles.messageSender}>{message.sender || 'VOX friend'}</Text>}
        {!!message.text && <Text style={styles.messageText}>{message.text}</Text>}
        {!!message.mediaUrl && (
          <Text style={styles.mediaNotice}>Attachment shared · open VOX web to view this file</Text>
        )}
        <Text style={styles.messageTime}>{time}</Text>
      </View>
    </View>
  );
}

function EmptyList({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyList}>
      <Text style={styles.emptyListTitle}>{title}</Text>
      <Text style={styles.emptyListBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeRoot: { flex: 1, backgroundColor: COLORS.background },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  brandWord: { color: COLORS.cyan, fontSize: 48, fontWeight: '900', letterSpacing: 8 },
  mutedText: { color: COLORS.muted, fontSize: 13 },
  authKeyboard: { flex: 1 },
  authScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 22, paddingVertical: 34 },
  authBrand: { alignItems: 'center', marginBottom: 26 },
  logoTile: {
    height: 58, width: 58, borderRadius: 18, backgroundColor: COLORS.text,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: COLORS.cyan, shadowOpacity: 0.28, shadowRadius: 18, elevation: 6,
  },
  logoLetter: { fontSize: 38, fontWeight: '900', color: '#0A5367' },
  authTagline: { color: COLORS.muted, fontWeight: '800', letterSpacing: 2, fontSize: 10, marginTop: 7 },
  authIntro: { color: COLORS.muted, fontSize: 14, marginTop: 12 },
  authCard: {
    width: '100%', maxWidth: 460, backgroundColor: COLORS.panel,
    borderColor: COLORS.border, borderWidth: 1, borderRadius: 24, padding: 22,
  },
  segmentRow: { flexDirection: 'row', gap: 8, padding: 4, borderRadius: 13, backgroundColor: COLORS.background, marginBottom: 22 },
  segmentButton: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  segmentActive: { backgroundColor: COLORS.panelSoft },
  segmentText: { color: COLORS.muted, fontWeight: '700', fontSize: 13 },
  segmentTextActive: { color: COLORS.cyan },
  formTitle: { color: COLORS.text, fontWeight: '800', fontSize: 22, marginBottom: 20 },
  fieldLabel: { color: COLORS.muted, fontWeight: '800', fontSize: 10, letterSpacing: 1.1, marginBottom: 8, marginTop: 5 },
  input: {
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, color: COLORS.text, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, marginBottom: 13,
  },
  primaryButton: {
    backgroundColor: COLORS.cyan, minHeight: 50, alignItems: 'center', justifyContent: 'center',
    borderRadius: 13, marginTop: 8,
  },
  primaryButtonText: { color: COLORS.background, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  buttonDisabled: { opacity: 0.45 },
  errorText: { color: COLORS.danger, lineHeight: 20, fontSize: 12, marginBottom: 7 },
  authFootnote: { color: COLORS.muted, fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 16 },
  authFootnoteMuted: { color: COLORS.quiet, fontSize: 10, textAlign: 'center', lineHeight: 16, marginTop: 8 },
  appShell: { flex: 1, backgroundColor: COLORS.background },
  appHeader: {
    height: 62, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  headerLogo: { height: 30, width: 30, borderRadius: 9, backgroundColor: COLORS.text, alignItems: 'center', justifyContent: 'center' },
  headerLogoText: { fontSize: 21, color: '#0A5367', fontWeight: '900' },
  headerWord: { color: COLORS.text, fontWeight: '900', fontSize: 20, letterSpacing: 2 },
  headerTag: { color: COLORS.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginLeft: 3 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  connectedPill: { borderWidth: 1, borderColor: '#1F564A', backgroundColor: '#102821', borderRadius: 99, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6 },
  connectedText: { color: COLORS.green, fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  liveDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: COLORS.green },
  mainLayout: { flex: 1, minHeight: 0 },
  mainLayoutTablet: { flexDirection: 'row' },
  sidebar: { flex: 1, minHeight: 0, backgroundColor: COLORS.panel },
  sidebarTablet: { flex: 0, width: 330, borderRightWidth: 1, borderRightColor: COLORS.border },
  listModeRow: { flexDirection: 'row', padding: 12, gap: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  listModeButton: { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 10, backgroundColor: COLORS.background },
  listModeActive: { backgroundColor: '#173347', borderWidth: 1, borderColor: '#245D71' },
  listModeText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  listModeTextActive: { color: COLORS.cyan },
  sidebarScroll: { padding: 14, paddingBottom: 22 },
  sectionCaption: { color: COLORS.quiet, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 12 },
  personRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 13, gap: 11, marginBottom: 5 },
  rowActive: { backgroundColor: '#1B2B43' },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#1A5265', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '900', color: COLORS.text, fontSize: 15 },
  personCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700', flex: 1 },
  rowSubtitle: { color: COLORS.quiet, fontSize: 10, marginTop: 3 },
  onlineDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: COLORS.green },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 10, borderRadius: 12, marginBottom: 5 },
  smallIcon: { width: 33, height: 33, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#184154' },
  groupIcon: { backgroundColor: '#392754' },
  serverIcon: { width: 34, height: 34, backgroundColor: '#194A59', borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  smallIconText: { color: COLORS.text, fontWeight: '900', fontSize: 12 },
  chevron: { color: COLORS.muted, fontSize: 20 },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 22, paddingRight: 10, borderRadius: 9 },
  channelActive: { backgroundColor: '#172C40' },
  channelSymbol: { color: COLORS.cyan, fontWeight: '900', fontSize: 15 },
  channelText: { color: COLORS.muted, fontSize: 12, flex: 1 },
  noChannels: { color: COLORS.quiet, fontSize: 11, paddingLeft: 24, paddingVertical: 9 },
  emptyList: { padding: 16, borderRadius: 14, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, marginTop: 4 },
  emptyListTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginBottom: 6 },
  emptyListBody: { color: COLORS.muted, fontSize: 11, lineHeight: 17 },
  accountBar: { borderTopWidth: 1, borderTopColor: COLORS.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  accountAvatar: { width: 35, height: 35, borderRadius: 12, backgroundColor: '#1A5265', alignItems: 'center', justifyContent: 'center' },
  accountText: { flex: 1, minWidth: 0 },
  accountName: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  accountEmail: { color: COLORS.quiet, fontSize: 9, marginTop: 3 },
  signOutButton: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 9, backgroundColor: COLORS.panelSoft },
  signOutText: { color: COLORS.muted, fontSize: 10, fontWeight: '800' },
  chatPane: { flex: 1, minHeight: 0, backgroundColor: COLORS.background },
  chatHeader: { height: 66, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { width: 35, height: 38, borderRadius: 11, backgroundColor: COLORS.panel, alignItems: 'center', justifyContent: 'center' },
  backButtonText: { color: COLORS.cyan, fontSize: 30, lineHeight: 32 },
  chatHeaderCopy: { flex: 1, minWidth: 0 },
  chatTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  chatSubtitle: { color: COLORS.quiet, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 5 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 99, backgroundColor: '#102821' },
  liveText: { color: COLORS.green, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  messageList: { flex: 1 },
  messageListContent: { flexGrow: 1, justifyContent: 'flex-start', padding: 14, paddingBottom: 22 },
  messageRow: { width: '100%', alignItems: 'flex-start', marginVertical: 4 },
  messageRowOwn: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '86%', borderRadius: 17, paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1 },
  messageBubbleOwn: { backgroundColor: '#123B4A', borderColor: '#1C6576', borderBottomRightRadius: 5 },
  messageBubbleOther: { backgroundColor: COLORS.panel, borderColor: COLORS.border, borderBottomLeftRadius: 5 },
  messageSender: { color: COLORS.cyan, fontSize: 10, fontWeight: '900', marginBottom: 5 },
  messageText: { color: COLORS.text, fontSize: 14, lineHeight: 21 },
  messageTime: { color: COLORS.quiet, fontSize: 9, marginTop: 6, textAlign: 'right' },
  mediaNotice: { color: COLORS.purple, fontSize: 11, marginTop: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, padding: 11, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.panel },
  composerInput: { flex: 1, maxHeight: 120, minHeight: 44, borderRadius: 13, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 14, paddingHorizontal: 13, paddingTop: 12, paddingBottom: 10 },
  sendButton: { height: 44, width: 46, borderRadius: 13, backgroundColor: COLORS.cyan, alignItems: 'center', justifyContent: 'center' },
  sendButtonText: { color: COLORS.background, fontSize: 24, fontWeight: '900' },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyIcon: { width: 62, height: 62, borderRadius: 21, backgroundColor: '#123C4B', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyIconText: { color: COLORS.cyan, fontWeight: '900', fontSize: 32 },
  emptyTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  emptyBody: { color: COLORS.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 330, marginTop: 10 },
  tabletHint: { color: COLORS.quiet, fontSize: 10, textAlign: 'center', marginTop: 20 },
  inlineError: { color: COLORS.danger, fontSize: 11, paddingHorizontal: 14, paddingBottom: 8 },
});


import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, AppState, FlatList, Image, KeyboardAvoidingView,
  Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet,
  Switch, Text, TextInput, View, useWindowDimensions
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where
} from "firebase/firestore";
import { auth, db } from "./src/firebase";
import { createVoxAccount, signInWithVoxIdentifier } from "./src/services/auth";
import { sendRoomMessage, subscribeToRoomMessages } from "./src/services/chat";
import type {
  ChatTarget, FriendProfile, VoxChannel, VoxGroup, VoxMessage, VoxProfile, VoxServer
} from "./src/types";

const BG = "#0A0E1A";
const PANEL = "#111A2B";
const PANEL_LIGHT = "#17243A";
const LINE = "#263750";
const TEXT = "#EEF5FF";
const MUTED = "#93A5BF";
const CYAN = "#00D4FF";
const GREEN = "#34D399";

type MainTab = "friends" | "groups" | "servers";

function initials(value: string): string {
  return value.trim().slice(0, 1).toUpperCase() || "V";
}

function SettingRow({ title, description, value, onValueChange }: { title: string; description: string; value: boolean; onValueChange: (value: boolean) => void }): React.JSX.Element {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingRowTitle}>{title}</Text>
        <Text style={styles.settingRowDescription}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#34445B", true: "#087D9B" }} thumbColor={value ? CYAN : "#D4DCE8"} />
    </View>
  );
}

function Avatar({ uri, label, size = 44 }: { uri?: string; label: string; size?: number }) {
  if (uri && /^https?:\/\//i.test(uri)) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PANEL_LIGHT }}
      />
    );
  }

  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarLetter, { fontSize: size * 0.42 }]}>{initials(label)}</Text>
    </View>
  );
}

function AuthScreen(): React.JSX.Element {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        await createVoxAccount(email, username, password, confirmPassword);
      } else {
        await signInWithVoxIdentifier(identifier, password);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not connect to VOX.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.authWrap}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>V</Text></View>
          <Text style={styles.brandTitle}>VOX</Text>
          <Text style={styles.brandSubtitle}>YOUR PEOPLE. YOUR SPACE.</Text>

          <View style={styles.authCard}>
            <Text style={styles.eyebrow}>VOX MOBILE</Text>
            <Text style={styles.authTitle}>{mode === "login" ? "Welcome back" : "Create your account"}</Text>
            <Text style={styles.mutedText}>
              {mode === "login"
                ? "Sign in with the same VOX email or username."
                : "Your account will work on VOX Web and Desktop too."}
            </Text>

            {mode === "signup" ? (
              <>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  placeholderTextColor={MUTED}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username"
                  placeholderTextColor={MUTED}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </>
            ) : (
              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="Email or username"
                placeholderTextColor={MUTED}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            )}

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={MUTED}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />

            {mode === "signup" ? (
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor={MUTED}
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
              />
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryButton, busy && styles.disabledButton]}
              onPress={submit}
              disabled={busy}
            >
              {busy ? <ActivityIndicator color={BG} /> : (
                <Text style={styles.primaryButtonText}>
                  {mode === "login" ? "Sign in to VOX" : "Create VOX account"}
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.modeSwitch}
              onPress={() => {
                setError("");
                setMode(mode === "login" ? "signup" : "login");
              }}
            >
              <Text style={styles.modeSwitchText}>
                {mode === "login" ? "New to VOX? " : "Already have an account? "}
                <Text style={styles.linkText}>{mode === "login" ? "Create account" : "Sign in"}</Text>
              </Text>
            </Pressable>
          </View>
          <Text style={styles.footerText}>One VOX account across your devices.</Text>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

function EmptyList({ title, description }: { title: string; description: string }): React.JSX.Element {
  return (
    <View style={styles.emptyList}>
      <View style={styles.emptyListMark}><Text style={styles.emptyListMarkText}>V</Text></View>
      <Text style={styles.emptyListTitle}>{title}</Text>
      <Text style={styles.emptyListDescription}>{description}</Text>
    </View>
  );
}

function formatMessageTime(message: VoxMessage): string {
  const millis = message.timestamp?.toMillis?.() || message.clientTimestamp;
  if (!millis) return "";
  return new Date(millis).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const MessageRow = memo(function MessageRow({
  item,
  currentUid
}: {
  item: VoxMessage;
  currentUid: string;
}): React.JSX.Element {
  const mine = item.senderUid === currentUid;
  return (
    <View style={[styles.messageLine, mine ? styles.myMessageLine : styles.otherMessageLine]}>
      {!mine ? <Text style={styles.senderName}>{item.sender || "VOXer"}</Text> : null}
      <View style={[styles.messageBubble, mine ? styles.myBubble : styles.otherBubble]}>
        {item.text ? <Text style={styles.messageText}>{item.text}</Text> : null}
        {item.mediaUrl ? (
          item.mediaType?.startsWith("image/") ? (
            <Image source={{ uri: item.mediaUrl }} style={styles.sharedImage} resizeMode="cover" />
          ) : (
            <Text style={styles.mediaLabel}>Shared attachment: {item.mediaType || "file"}</Text>
          )
        ) : null}
        <Text style={styles.messageTime}>{formatMessageTime(item)}</Text>
      </View>
    </View>
  );
});

export default function App(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const isTablet = width >= 820;
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<VoxProfile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [friendProfiles, setFriendProfiles] = useState<FriendProfile[]>([]);
  const [servers, setServers] = useState<VoxServer[]>([]);
  const [groups, setGroups] = useState<VoxGroup[]>([]);
  const [selectedServer, setSelectedServer] = useState<VoxServer | null>(null);
  const [channels, setChannels] = useState<VoxChannel[]>([]);
  const [activeTab, setActiveTab] = useState<MainTab>("friends");
  const [activeChat, setActiveChat] = useState<ChatTarget | null>(null);
  const [messages, setMessages] = useState<VoxMessage[]>([]);
  const [chatError, setChatError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [listError, setListError] = useState("");
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [performancePrefs, setPerformancePrefs] = useState({
    lowLatency: false,
    disableAnimations: false,
    microphoneEnabled: true,
    cameraEnabled: true
  });

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem("vox:performance-preferences").then((raw) => {
      if (!active || !raw) return;
      try {
        const saved = JSON.parse(raw);
        setPerformancePrefs((current) => ({ ...current, ...saved }));
      } catch { /* Ignore invalid local preferences. */ }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const updatePerformancePref = useCallback((key: keyof typeof performancePrefs, value: boolean) => {
    setPerformancePrefs((current) => {
      const next = { ...current, [key]: value };
      AsyncStorage.setItem("vox:performance-preferences", JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (!user) {
        setProfile(null);
        setProfileReady(false);
        setFriendProfiles([]);
        setServers([]);
        setGroups([]);
        setActiveChat(null);
        setSelectedServer(null);
      }
    });
  }, []);

  const uid = authUser?.uid;

  const renderMessage = useCallback(
    ({ item }: { item: VoxMessage }) => (
      <MessageRow item={item} currentUid={authUser?.uid || ""} />
    ),
    [authUser?.uid]
  );

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setProfileReady(false);
      return;
    }

    setProfileReady(false);
    return onSnapshot(
      doc(db, "vox_users", uid),
      (snapshot) => {
        setProfile(snapshot.exists() ? snapshot.data() as VoxProfile : null);
        setProfileReady(true);
      },
      (error) => {
        setListError(error.message);
        setProfileReady(true);
      }
    );
  }, [uid]);

  useEffect(() => {
    if (!uid) return;

    const stopServers = onSnapshot(
      collection(db, "vox_servers"),
      (snapshot) => {
        setServers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as VoxServer)));
        setListError("");
      },
      (error) => setListError(error.message)
    );

    const groupsQuery = query(
      collection(db, "vox_groups"),
      where("members", "array-contains", uid)
    );
    const stopGroups = onSnapshot(
      groupsQuery,
      (snapshot) => setGroups(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as VoxGroup))),
      (error) => setListError(error.message)
    );

    return () => {
      stopServers();
      stopGroups();
    };
  }, [uid]);

  const friendKey = useMemo(
    () => (profile?.friends || []).filter(Boolean).join("|"),
    [profile?.friends]
  );

  useEffect(() => {
    if (!uid || !profile) {
      setFriendProfiles([]);
      return;
    }

    const blocked = new Set(profile.blockedUsers || []);
    const friendIds = friendKey ? friendKey.split("|").filter((id) => !blocked.has(id)) : [];
    let active = true;

    async function loadFriends() {
      try {
        const loaded = await Promise.all(friendIds.map(async (friendId) => {
          const friendSnapshot = await getDoc(doc(db, "vox_users", friendId));
          if (!friendSnapshot.exists()) return null;

          const friend = friendSnapshot.data() as VoxProfile;
          if (
            !(friend.friends || []).includes(uid) ||
            (friend.blockedUsers || []).includes(uid)
          ) return null;

          return { id: friendId, ...friend } as FriendProfile;
        }));

        if (active) {
          setFriendProfiles(
            loaded.filter((item): item is FriendProfile => item !== null)
              .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""))
          );
        }
      } catch (error) {
        if (active) setListError(error instanceof Error ? error.message : "Could not load friends.");
      }
    }

    void loadFriends();
    return () => { active = false; };
  }, [uid, friendKey, profile?.blockedUsers]);

  useEffect(() => {
    if (!selectedServer) {
      setChannels([]);
      return;
    }

    const channelQuery = query(
      collection(db, "vox_channels"),
      where("serverId", "==", selectedServer.id)
    );
    return onSnapshot(
      channelQuery,
      (snapshot) => {
        setChannels(
          snapshot.docs
            .map((item) => ({ id: item.id, ...item.data() } as VoxChannel))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      },
      (error) => setListError(error.message)
    );
  }, [selectedServer?.id]);

  useEffect(() => {
    if (!authUser || !activeChat || activeChat.kind === "voice") {
      setMessages([]);
      setChatError("");
      return;
    }

    setChatError("");
    return subscribeToRoomMessages(
      activeChat,
      authUser.uid,
      setMessages,
      (error) => setChatError(error.message)
    );
  }, [authUser?.uid, activeChat?.kind, activeChat?.id]);

  useEffect(() => {
    if (!uid) return;

    const writePresence = (state: string) => {
      const status = state === "active" ? "online" : "away";
      void setDoc(
        doc(db, "vox_presence", uid),
        { status, lastChanged: serverTimestamp() },
        { merge: true }
      ).catch(() => undefined);
    };

    writePresence(AppState.currentState);
    const subscription = AppState.addEventListener("change", writePresence);
    return () => {
      subscription.remove();
      void setDoc(
        doc(db, "vox_presence", uid),
        { status: "offline", lastChanged: serverTimestamp() },
        { merge: true }
      ).catch(() => undefined);
    };
  }, [uid]);

  async function sendMessage() {
    if (!authUser || !profile || !activeChat || !draft.trim() || sending) return;

    const text = draft.trim();
    setDraft("");
    setSending(true);
    setChatError("");
    try {
      await sendRoomMessage(activeChat, authUser, profile, text);
    } catch (error) {
      setDraft(text);
      setChatError(error instanceof Error ? error.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  function openFriend(friend: FriendProfile) {
    setSelectedServer(null);
    setActiveChat({
      kind: "dm",
      id: friend.id,
      title: friend.displayName || "Direct Message",
      subtitle: "@" + (friend.username || "voxer")
    });
  }

  function openGroup(group: VoxGroup) {
    setSelectedServer(null);
    setActiveChat({
      kind: "group",
      id: group.id,
      title: group.name || "Group",
      subtitle: "Group conversation"
    });
  }

  function openChannel(channel: VoxChannel) {
    if (!selectedServer) return;

    if (channel.type === "voice") {
      setActiveChat({
        kind: "voice",
        id: channel.id,
        serverId: selectedServer.id,
        title: channel.name,
        subtitle: selectedServer.name
      });
      return;
    }

    setActiveChat({
      kind: "channel",
      id: channel.id,
      serverId: selectedServer.id,
      title: "#" + channel.name,
      subtitle: selectedServer.name
    });
  }

  async function logout() {
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert("VOX", error instanceof Error ? error.message : "Could not sign out.");
    }
  }

  if (!authReady || (authUser && !profileReady)) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor={BG} />
        <Text style={styles.loadingBrand}>VOX</Text>
        <ActivityIndicator color={CYAN} size="large" />
        <Text style={styles.mutedText}>Connecting to your VOX account…</Text>
      </SafeAreaView>
    );
  }

  if (!authUser) return <AuthScreen />;

  const showSidebar = isTablet || !activeChat;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <View style={[styles.appShell, isTablet && styles.tabletShell]}>
        {showSidebar ? (
          <View style={[styles.sidebar, isTablet && styles.tabletSidebar]}>
            <View style={styles.sidebarHeader}>
              <View style={styles.brandRow}>
                <View style={styles.smallBrandMark}><Text style={styles.smallBrandText}>V</Text></View>
                <View>
                  <Text style={styles.sidebarBrand}>VOX</Text>
                  <Text style={styles.sidebarCaption}>MOBILE</Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <Pressable onPress={() => setSettingsVisible(true)} style={styles.settingsButton}>
                  <Text style={styles.settingsButtonText}>⚙ Settings</Text>
                </Pressable>
                <Pressable onPress={logout} style={styles.logoutButton}>
                  <Text style={styles.logoutText}>Sign out</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.accountBar}>
              <Avatar uri={profile?.photoURL} label={profile?.displayName || "VOX"} size={38} />
              <View style={styles.accountCopy}>
                <Text style={styles.accountName} numberOfLines={1}>{profile?.displayName || "VOXer"}</Text>
                <Text style={styles.accountHandle} numberOfLines={1}>@{profile?.username || "voxer"}</Text>
              </View>
              <View style={styles.onlineDot} />
            </View>

            <View style={styles.tabs}>
              {(["friends", "groups", "servers"] as MainTab[]).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => {
                    setActiveTab(tab);
                    setSelectedServer(null);
                  }}
                  style={[styles.tab, activeTab === tab && styles.activeTab]}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                    {tab === "friends" ? "Friends" : tab === "groups" ? "Groups" : "Servers"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView style={styles.listArea} contentContainerStyle={styles.listContent}>
              {listError ? <Text style={styles.errorText}>{listError}</Text> : null}

              {activeTab === "friends" ? (
                friendProfiles.length > 0 ? friendProfiles.map((friend) => (
                  <Pressable
                    key={friend.id}
                    onPress={() => openFriend(friend)}
                    style={({ pressed }) => [styles.personRow, pressed && styles.rowPressed]}
                  >
                    <Avatar uri={friend.photoURL} label={friend.displayName || "V"} />
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{friend.displayName || "VOXer"}</Text>
                      <Text style={styles.rowSubtitle} numberOfLines={1}>@{friend.username || "voxer"}</Text>
                    </View>
                    <Text style={styles.rowArrow}>›</Text>
                  </Pressable>
                )) : (
                  <EmptyList
                    title="Your friends will appear here"
                    description="VOX only shows accepted mutual friends in your chat list."
                  />
                )
              ) : null}

              {activeTab === "groups" ? (
                groups.length > 0 ? groups.map((group) => (
                  <Pressable key={group.id} onPress={() => openGroup(group)} style={styles.personRow}>
                    <View style={styles.groupIcon}><Text style={styles.groupIconText}>G</Text></View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{group.name || "Group"}</Text>
                      <Text style={styles.rowSubtitle}>{(group.members || []).length} members</Text>
                    </View>
                    <Text style={styles.rowArrow}>›</Text>
                  </Pressable>
                )) : (
                  <EmptyList title="No groups yet" description="Groups you belong to will show up here." />
                )
              ) : null}

              {activeTab === "servers" ? (
                selectedServer ? (
                  <>
                    <Pressable style={styles.backToList} onPress={() => setSelectedServer(null)}>
                      <Text style={styles.backToListText}>‹ All servers</Text>
                    </Pressable>
                    <Text style={styles.sectionLabel}>{selectedServer.name}</Text>
                    {channels.length > 0 ? channels.map((channel) => (
                      <Pressable key={channel.id} onPress={() => openChannel(channel)} style={styles.personRow}>
                        <View style={[styles.channelIcon, channel.type === "voice" && styles.voiceIcon]}>
                          <Text style={styles.channelIconText}>{channel.type === "voice" ? "♫" : "#"}</Text>
                        </View>
                        <View style={styles.rowCopy}>
                          <Text style={styles.rowTitle} numberOfLines={1}>{channel.name}</Text>
                          <Text style={styles.rowSubtitle}>{channel.type === "voice" ? "Voice channel" : "Text channel"}</Text>
                        </View>
                        <Text style={styles.rowArrow}>›</Text>
                      </Pressable>
                    )) : <EmptyList title="No channels yet" description="This server has no channels to show." />}
                  </>
                ) : (
                  servers.length > 0 ? servers.map((server) => (
                    <Pressable key={server.id} onPress={() => setSelectedServer(server)} style={styles.personRow}>
                      <View style={styles.serverIcon}><Text style={styles.serverIconText}>{initials(server.name || "S")}</Text></View>
                      <View style={styles.rowCopy}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{server.name}</Text>
                        <Text style={styles.rowSubtitle}>Open server channels</Text>
                      </View>
                      <Text style={styles.rowArrow}>›</Text>
                    </Pressable>
                  )) : <EmptyList title="No servers available" description="Servers you can access will appear here." />
                )
              ) : null}
            </ScrollView>

            <View style={styles.sidebarFoot}>
              <Text style={styles.sidebarFootText}>Same VOX account · Same Firebase data</Text>
            </View>
          </View>
        ) : null}

        {activeChat ? (
          <KeyboardAvoidingView
            style={styles.chatPanel}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
          >
            <View style={styles.chatHeader}>
              {!isTablet ? (
                <Pressable style={styles.mobileBack} onPress={() => setActiveChat(null)}>
                  <Text style={styles.mobileBackText}>‹</Text>
                </Pressable>
              ) : null}
              <View style={styles.chatHeaderCopy}>
                <Text style={styles.chatTitle} numberOfLines={1}>{activeChat.title}</Text>
                <Text style={styles.chatSubtitle} numberOfLines={1}>{activeChat.subtitle}</Text>
              </View>
              <Pressable
                style={styles.callButton}
                onPress={() => Alert.alert(
                  "VOX Calls",
                  "The native chat foundation is being connected first. Native voice and video calling is the next mobile feature pass."
                )}
              >
                <Text style={styles.callButtonText}>Call</Text>
              </Pressable>
            </View>

            {activeChat.kind === "voice" ? (
              <View style={styles.voicePlaceholder}>
                <View style={styles.voicePulse}><Text style={styles.voicePulseText}>♫</Text></View>
                <Text style={styles.voiceTitle}>{activeChat.title}</Text>
                <Text style={styles.mutedText}>Native voice and video controls are being built next.</Text>
              </View>
            ) : (
              <>
                {chatError ? <Text style={styles.chatError}>{chatError}</Text> : null}
                <FlatList
                  style={styles.messageList}
                  contentContainerStyle={styles.messageListContent}
                  data={messages}
                  inverted
                  keyExtractor={(item) => item.id}
                  initialNumToRender={performancePrefs.lowLatency ? 8 : 12}
                  maxToRenderPerBatch={performancePrefs.lowLatency ? 6 : 8}
                  updateCellsBatchingPeriod={performancePrefs.lowLatency ? 35 : 50}
                  windowSize={performancePrefs.lowLatency ? 5 : 7}
                  maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                  removeClippedSubviews={Platform.OS === "android"}
                  keyboardShouldPersistTaps="handled"
                  renderItem={renderMessage}
                  ListEmptyComponent={
                    <View style={styles.emptyMessages}>
                      <Text style={styles.emptyMessagesTitle}>This is the beginning</Text>
                      <Text style={styles.mutedText}>Send a message to start the conversation.</Text>
                    </View>
                  }
                />
                <View style={styles.composer}>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Message VOX…"
                    placeholderTextColor={MUTED}
                    style={styles.composerInput}
                    multiline
                    maxLength={4000}
                    blurOnSubmit={false}
                  />
                  <Pressable
                    onPress={sendMessage}
                    disabled={!draft.trim() || sending}
                    style={[styles.sendButton, (!draft.trim() || sending) && styles.disabledButton]}
                  >
                    {sending ? <ActivityIndicator size="small" color={BG} /> : <Text style={styles.sendButtonText}>Send</Text>}
                  </Pressable>
                </View>
              </>
            )}
          </KeyboardAvoidingView>
        ) : isTablet ? (
          <View style={styles.welcomePanel}>
            <View style={styles.welcomeMark}><Text style={styles.brandMarkText}>V</Text></View>
            <Text style={styles.welcomeTitle}>Welcome to VOX</Text>
            <Text style={styles.welcomeCopy}>Choose a friend, group or channel to open a conversation.</Text>
          </View>
        ) : null}
      </View>
      <Modal visible={settingsVisible} transparent animationType={performancePrefs.disableAnimations ? "none" : "fade"} onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.settingsBackdrop}>
          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>VOX Settings</Text>
            <Text style={styles.settingsDescription}>Performance and device preferences · saved on this device</Text>
            <SettingRow title="Low Latency Profile" description="Uses a lighter message-list rendering profile." value={performancePrefs.lowLatency} onValueChange={(value) => updatePerformancePref("lowLatency", value)} />
            <SettingRow title="Disable Animation Effects" description="Disables the settings dialog transition. Chat messages currently use no entrance animation." value={performancePrefs.disableAnimations} onValueChange={(value) => updatePerformancePref("disableAnimations", value)} />
            <SettingRow title="Microphone enabled for calls" description="Saved preference for native calling when it is implemented." value={performancePrefs.microphoneEnabled} onValueChange={(value) => updatePerformancePref("microphoneEnabled", value)} />
            <SettingRow title="Camera enabled for calls" description="Saved preference for native calling when it is implemented." value={performancePrefs.cameraEnabled} onValueChange={(value) => updatePerformancePref("cameraEnabled", value)} />
            <View style={styles.settingInfo}>
              <Text style={styles.settingInfoTitle}>Hardware acceleration</Text>
              <Text style={styles.settingInfoText}>Managed by Android/iOS and the app runtime. VOX cannot safely toggle the device GPU setting from this screen.</Text>
            </View>
            <Pressable onPress={() => setSettingsVisible(false)} style={styles.settingsDone}><Text style={styles.settingsDoneText}>Done</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loadingScreen: { flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center", gap: 18 },
  loadingBrand: { fontSize: 36, fontWeight: "900", letterSpacing: 7, color: CYAN },
  mutedText: { color: MUTED, fontSize: 13, lineHeight: 20 },
  authScroll: { flexGrow: 1, justifyContent: "center", padding: 22, paddingVertical: 34 },
  authWrap: { width: "100%", maxWidth: 460, alignSelf: "center", alignItems: "center" },
  brandMark: { width: 74, height: 74, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#EAFBFF", borderWidth: 5, borderColor: "#16465A" },
  brandMarkText: { color: "#087D9B", fontSize: 49, fontWeight: "900", lineHeight: 55 },
  brandTitle: { color: TEXT, fontSize: 44, fontWeight: "900", letterSpacing: 9, marginTop: 8 },
  brandSubtitle: { color: MUTED, fontSize: 10, letterSpacing: 3, fontWeight: "800", marginTop: 2, marginBottom: 26 },
  authCard: { width: "100%", backgroundColor: PANEL, borderWidth: 1, borderColor: LINE, borderRadius: 24, padding: 22 },
  eyebrow: { color: CYAN, fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  authTitle: { color: TEXT, fontSize: 26, fontWeight: "800", marginTop: 10 },
  input: { color: TEXT, backgroundColor: "#0B1322", borderColor: LINE, borderWidth: 1, borderRadius: 13, minHeight: 52, paddingHorizontal: 15, fontSize: 15, marginTop: 14 },
  errorText: { color: "#FF8D9B", fontSize: 12, lineHeight: 18, marginTop: 12 },
  primaryButton: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: CYAN, marginTop: 18, paddingHorizontal: 18 },
  primaryButtonText: { color: "#04121C", fontSize: 15, fontWeight: "900" },
  disabledButton: { opacity: 0.45 },
  modeSwitch: { alignItems: "center", paddingTop: 19, paddingBottom: 4 },
  modeSwitchText: { color: MUTED, fontSize: 13 },
  linkText: { color: CYAN, fontWeight: "800" },
  footerText: { color: "#62738C", fontSize: 11, marginTop: 22 },
  appShell: { flex: 1, backgroundColor: BG },
  tabletShell: { flexDirection: "row" },
  sidebar: { flex: 1, backgroundColor: BG, paddingHorizontal: 16, paddingTop: 10 },
  tabletSidebar: { flex: 0, width: 340, borderRightWidth: 1, borderRightColor: LINE },
  sidebarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  smallBrandMark: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#EAFBFF", alignItems: "center", justifyContent: "center" },
  smallBrandText: { color: "#087D9B", fontWeight: "900", fontSize: 25 },
  sidebarBrand: { color: TEXT, fontSize: 19, letterSpacing: 3, fontWeight: "900" },
  sidebarCaption: { color: MUTED, fontSize: 8, letterSpacing: 2, fontWeight: "900" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 7 },
  settingsButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#30506B", backgroundColor: PANEL },
  settingsButtonText: { color: CYAN, fontSize: 11, fontWeight: "800" },
  logoutButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: LINE },
  settingsBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: 18 },
  settingsCard: { width: "100%", maxWidth: 520, alignSelf: "center", backgroundColor: PANEL, borderWidth: 1, borderColor: LINE, borderRadius: 20, padding: 18 },
  settingsTitle: { color: TEXT, fontSize: 21, fontWeight: "900" },
  settingsDescription: { color: MUTED, fontSize: 11, marginTop: 5, marginBottom: 10, lineHeight: 17 },
  settingRow: { minHeight: 68, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 10 },
  settingCopy: { flex: 1, minWidth: 0 },
  settingRowTitle: { color: TEXT, fontSize: 13, fontWeight: "800" },
  settingRowDescription: { color: MUTED, fontSize: 10, lineHeight: 15, marginTop: 4 },
  settingInfo: { paddingVertical: 12, gap: 5 },
  settingInfoTitle: { color: TEXT, fontSize: 12, fontWeight: "800" },
  settingInfoText: { color: MUTED, fontSize: 10, lineHeight: 15 },
  settingsDone: { minHeight: 44, borderRadius: 12, backgroundColor: CYAN, alignItems: "center", justifyContent: "center", marginTop: 8 },
  settingsDoneText: { color: BG, fontSize: 13, fontWeight: "900" },
  logoutText: { color: MUTED, fontSize: 11, fontWeight: "800" },
  accountBar: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, marginBottom: 16, padding: 12, borderRadius: 15, backgroundColor: PANEL },
  accountCopy: { flex: 1 },
  accountName: { color: TEXT, fontSize: 13, fontWeight: "800" },
  accountHandle: { color: MUTED, fontSize: 11, marginTop: 2 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  tabs: { flexDirection: "row", backgroundColor: PANEL, padding: 4, borderRadius: 12, gap: 4 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 9 },
  activeTab: { backgroundColor: "#19364A" },
  tabText: { color: MUTED, fontSize: 11, fontWeight: "800" },
  activeTabText: { color: CYAN },
  listArea: { flex: 1, marginTop: 12 },
  listContent: { paddingBottom: 18, flexGrow: 1 },
  personRow: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 6, backgroundColor: PANEL, borderRadius: 14, borderWidth: 1, borderColor: "#1A2A40" },
  rowPressed: { opacity: 0.7 },
  avatarFallback: { backgroundColor: "#19364A", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#27506A" },
  avatarLetter: { color: "#9DEFFF", fontWeight: "900" },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: TEXT, fontSize: 13, fontWeight: "800" },
  rowSubtitle: { color: MUTED, fontSize: 10, marginTop: 4 },
  rowArrow: { color: "#6B819E", fontSize: 24, paddingHorizontal: 4 },
  groupIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#2B2045" },
  groupIconText: { color: "#D9B7FF", fontWeight: "900", fontSize: 17 },
  serverIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#12384A", borderWidth: 1, borderColor: "#246078" },
  serverIconText: { color: CYAN, fontSize: 18, fontWeight: "900" },
  channelIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#142C40" },
  voiceIcon: { backgroundColor: "#2B2045" },
  channelIconText: { color: CYAN, fontWeight: "900", fontSize: 18 },
  backToList: { paddingVertical: 12, paddingHorizontal: 4 },
  backToListText: { color: CYAN, fontSize: 13, fontWeight: "900" },
  sectionLabel: { color: MUTED, fontSize: 10, letterSpacing: 1.3, fontWeight: "900", marginBottom: 10, marginTop: 4 },
  emptyList: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 42 },
  emptyListMark: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#143345" },
  emptyListMarkText: { color: CYAN, fontSize: 24, fontWeight: "900" },
  emptyListTitle: { color: TEXT, fontWeight: "800", fontSize: 13, marginTop: 15, textAlign: "center" },
  emptyListDescription: { color: MUTED, fontSize: 11, lineHeight: 18, marginTop: 7, textAlign: "center" },
  sidebarFoot: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: LINE },
  sidebarFootText: { color: "#63748D", textAlign: "center", fontSize: 9 },
  chatPanel: { flex: 1, minWidth: 0, backgroundColor: "#0D1524" },
  chatHeader: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: LINE, backgroundColor: PANEL },
  mobileBack: { width: 34, height: 38, alignItems: "center", justifyContent: "center" },
  mobileBackText: { color: CYAN, fontSize: 32, lineHeight: 35 },
  chatHeaderCopy: { flex: 1, minWidth: 0 },
  chatTitle: { color: TEXT, fontWeight: "900", fontSize: 15 },
  chatSubtitle: { color: MUTED, fontSize: 10, marginTop: 4 },
  callButton: { borderWidth: 1, borderColor: "#30506B", borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8 },
  callButtonText: { color: CYAN, fontSize: 11, fontWeight: "900" },
  messageList: { flex: 1 },
  messageListContent: { padding: 14, paddingBottom: 20, flexGrow: 1, justifyContent: "flex-end" },
  messageLine: { maxWidth: "88%", marginVertical: 5 },
  myMessageLine: { alignSelf: "flex-end", alignItems: "flex-end" },
  otherMessageLine: { alignSelf: "flex-start", alignItems: "flex-start" },
  senderName: { color: CYAN, fontSize: 10, fontWeight: "800", marginBottom: 4, marginLeft: 4 },
  messageBubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, minWidth: 64, borderWidth: 1 },
  myBubble: { backgroundColor: "#13364A", borderColor: "#20546D", borderTopRightRadius: 5 },
  otherBubble: { backgroundColor: PANEL_LIGHT, borderColor: "#2C3E56", borderTopLeftRadius: 5 },
  messageText: { color: TEXT, fontSize: 14, lineHeight: 20 },
  messageTime: { color: "#8DA3BE", alignSelf: "flex-end", fontSize: 9, marginTop: 5 },
  sharedImage: { width: 220, height: 160, borderRadius: 10, marginTop: 4, backgroundColor: BG },
  mediaLabel: { color: CYAN, fontSize: 12, paddingVertical: 8 },
  emptyMessages: { flex: 1, alignItems: "center", justifyContent: "center", transform: [{ scaleY: -1 }] },
  emptyMessagesTitle: { color: TEXT, fontSize: 16, fontWeight: "900", marginBottom: 8 },
  chatError: { color: "#FF9AA8", fontSize: 11, padding: 9, backgroundColor: "#3A1C2B" },
  composer: { flexDirection: "row", gap: 8, alignItems: "flex-end", padding: 10, paddingBottom: Platform.OS === "ios" ? 16 : 10, borderTopWidth: 1, borderTopColor: LINE, backgroundColor: PANEL },
  composerInput: { flex: 1, maxHeight: 110, minHeight: 44, color: TEXT, fontSize: 14, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 13, backgroundColor: "#0A1220", borderWidth: 1, borderColor: LINE },
  sendButton: { minHeight: 44, minWidth: 66, alignItems: "center", justifyContent: "center", borderRadius: 12, paddingHorizontal: 12, backgroundColor: CYAN },
  sendButtonText: { color: BG, fontSize: 12, fontWeight: "900" },
  voicePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 12 },
  voicePulse: { width: 94, height: 94, borderRadius: 30, backgroundColor: "#2B2045", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#7046A6" },
  voicePulseText: { color: "#D4B2FF", fontSize: 42 },
  voiceTitle: { color: TEXT, fontSize: 23, fontWeight: "900" },
  welcomePanel: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, backgroundColor: "#0D1524" },
  welcomeMark: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#EAFBFF", borderWidth: 5, borderColor: "#16465A" },
  welcomeTitle: { color: TEXT, fontSize: 26, fontWeight: "900", marginTop: 20 },
  welcomeCopy: { color: MUTED, fontSize: 13, textAlign: "center", marginTop: 8, maxWidth: 300, lineHeight: 20 }
});


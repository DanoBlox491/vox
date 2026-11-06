import type { User } from "firebase/auth";
import type { Timestamp } from "firebase/firestore";

export type VoxProfile = {
  displayName?: string;
  username?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
  friends?: string[];
  friendRequests?: string[];
  blockedUsers?: string[];
  socials?: { yt?: string; discord?: string };
};

export type FriendProfile = VoxProfile & { id: string };
export type VoxServer = { id: string; name: string; owner?: string };
export type VoxGroup = { id: string; name: string; members?: string[]; createdBy?: string };
export type VoxChannel = { id: string; name: string; type: "text" | "voice" | string; serverId: string };

export type ChatTarget =
  | { kind: "dm"; id: string; title: string; subtitle: string }
  | { kind: "group"; id: string; title: string; subtitle: string }
  | { kind: "channel"; id: string; title: string; subtitle: string; serverId: string }
  | { kind: "voice"; id: string; title: string; subtitle: string; serverId: string };

export type VoxMessage = {
  id: string;
  senderUid?: string;
  sender?: string;
  senderPhoto?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  timestamp?: Timestamp;
  clientTimestamp?: number;
};

export type AuthUser = User;

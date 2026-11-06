import type { Timestamp } from 'firebase/firestore';

export interface VoxProfile {
  displayName?: string;
  username?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
  friends?: string[];
  friendRequests?: string[];
  blockedUsers?: string[];
  socials?: { yt?: string; discord?: string };
}

export interface VoxFriend extends VoxProfile {
  uid: string;
}

export interface VoxServer {
  id: string;
  name?: string;
  owner?: string;
}

export interface VoxGroup {
  id: string;
  name?: string;
  members?: string[];
  createdBy?: string;
}

export interface VoxChannel {
  id: string;
  name?: string;
  serverId?: string;
  type?: 'text' | 'voice' | string;
}

export interface VoxMessage {
  id: string;
  senderUid?: string;
  sender?: string;
  senderPhoto?: string;
  text?: string;
  timestamp?: Timestamp | null;
  mediaUrl?: string;
  mediaType?: string;
  reactions?: Record<string, string[]>;
  dmId?: string;
  dmMembers?: string[];
  groupId?: string;
  serverId?: string;
  channel?: string;
}

export type ChatTarget =
  | { kind: 'dm'; id: string; title: string; roomKey: string }
  | { kind: 'group'; id: string; title: string; roomKey: string }
  | {
      kind: 'channel';
      id: string;
      serverId: string;
      title: string;
      channelType: string;
      roomKey: string;
    };

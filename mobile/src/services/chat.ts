import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type DocumentData,
  type Query
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "../firebase";
import type { ChatTarget, VoxMessage, VoxProfile } from "../types";

export function getDmRoomId(firstUid: string, secondUid: string): string {
  return firstUid < secondUid
    ? "dm_" + firstUid + "_" + secondUid
    : "dm_" + secondUid + "_" + firstUid;
}

export function subscribeToRoomMessages(
  target: ChatTarget,
  currentUid: string,
  onMessages: (messages: VoxMessage[]) => void,
  onError: (error: Error) => void
): () => void {
  if (target.kind === "voice") {
    onMessages([]);
    return () => undefined;
  }

  let roomQuery: Query<DocumentData>;
  if (target.kind === "dm") {
    roomQuery = query(
      collection(db, "vox_messages"),
      where("dmId", "==", getDmRoomId(currentUid, target.id)),
      orderBy("timestamp", "desc"),
      limit(50)
    );
  } else if (target.kind === "group") {
    roomQuery = query(
      collection(db, "vox_messages"),
      where("groupId", "==", target.id),
      orderBy("timestamp", "desc"),
      limit(50)
    );
  } else {
    roomQuery = query(
      collection(db, "vox_messages"),
      where("serverId", "==", target.serverId),
      where("channel", "==", target.id),
      orderBy("timestamp", "desc"),
      limit(50)
    );
  }

  return onSnapshot(
    roomQuery,
    (snapshot) => {
      onMessages(snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...(messageDoc.data() as Omit<VoxMessage, "id">)
      })));
    },
    onError
  );
}

export async function sendRoomMessage(
  target: ChatTarget,
  user: User,
  profile: VoxProfile,
  text: string
): Promise<void> {
  const cleanText = text.trim();
  if (!cleanText) return;
  if (target.kind === "voice") {
    throw new Error("Text messages cannot be sent to a voice channel.");
  }

  const payload: Record<string, unknown> = {
    senderUid: user.uid,
    sender: profile.displayName || user.email || "VOXer",
    senderPhoto: profile.photoURL || "",
    timestamp: serverTimestamp(),
    text: cleanText
  };

  if (target.kind === "dm") {
    if (!(profile.friends || []).includes(target.id) ||
        (profile.blockedUsers || []).includes(target.id)) {
      throw new Error("You can only message a mutual friend.");
    }

    const otherUser = await getDoc(doc(db, "vox_users", target.id));
    if (!otherUser.exists()) throw new Error("This VOX account could not be found.");

    const otherProfile = otherUser.data() as VoxProfile;
    if (!(otherProfile.friends || []).includes(user.uid) ||
        (otherProfile.blockedUsers || []).includes(user.uid)) {
      throw new Error("You can only message a mutual friend.");
    }

    payload.dmId = getDmRoomId(user.uid, target.id);
    payload.dmMembers = [user.uid, target.id].sort();
  } else if (target.kind === "group") {
    payload.groupId = target.id;
  } else {
    payload.serverId = target.serverId;
    payload.channel = target.id;
  }

  await addDoc(collection(db, "vox_messages"), payload);
}

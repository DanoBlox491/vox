import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  collection, doc, getDocs, limit, query, setDoc, where
} from "firebase/firestore";
import { auth, db } from "../firebase";

export async function signInWithVoxIdentifier(identifier: string, password: string): Promise<void> {
  const value = identifier.trim();
  if (!value || !password) throw new Error("Enter your email or username and password.");

  let email = value;
  if (!value.includes("@")) {
    const usernameQuery = query(
      collection(db, "vox_users"),
      where("username", "==", value.toLowerCase()),
      limit(1)
    );
    const usernameSnapshot = await getDocs(usernameQuery);
    if (usernameSnapshot.empty) throw new Error("That VOX username was not found.");

    const account = usernameSnapshot.docs[0].data();
    if (!account.email) {
      throw new Error("This older account has no email on its profile. Sign in with its email address.");
    }
    email = account.email;
  }

  await signInWithEmailAndPassword(auth, email, password);
}

export async function createVoxAccount(
  emailInput: string,
  usernameInput: string,
  password: string,
  confirmPassword: string
): Promise<void> {
  const email = emailInput.trim();
  const username = usernameInput.trim();
  const normalizedUsername = username.toLowerCase();

  if (!email || !username || !password || !confirmPassword) {
    throw new Error("Fill in every field.");
  }
  if (username.length < 3) throw new Error("Username must be at least 3 characters.");
  if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
    throw new Error("Username can only use letters, numbers and underscores.");
  }
  if (password !== confirmPassword) throw new Error("The passwords do not match.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  const usernameQuery = query(
    collection(db, "vox_users"),
    where("username", "==", normalizedUsername),
    limit(1)
  );
  const usernameSnapshot = await getDocs(usernameQuery);
  if (!usernameSnapshot.empty) throw new Error("That username is already taken.");

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await setDoc(doc(db, "vox_users", credential.user.uid), {
      displayName: username,
      username: normalizedUsername,
      email,
      photoURL: "",
      bio: "",
      socials: { yt: "", discord: "" },
      friends: [],
      friendRequests: [],
      blockedUsers: []
    });
  } catch {
    await signOut(auth).catch(() => undefined);
    throw new Error(
      "The authentication account was created, but its VOX profile could not be saved. Check the existing Firestore rules before trying again."
    );
  }
}

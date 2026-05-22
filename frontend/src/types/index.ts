export interface User {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  verified: boolean;
  createdAt: string;
  _count?: { posts: number; followers: number; following: number };
  isFollowing?: boolean;
}

export interface Post {
  id: string;
  content: string;
  mediaUrl: string;
  mediaType: 'none' | 'image' | 'video';
  createdAt: string;
  repostOfId?: string | null;
  repostOf?: Pick<Post, 'id' | 'content' | 'mediaUrl' | 'mediaType' | 'author' | 'createdAt'> | null;
  author: Pick<User, 'id' | 'username' | 'displayName' | 'avatar' | 'verified'>;
  community?: { id: string; name: string } | null;
  hashtags?: { hashtag: { tag: string } }[];
  _count: { likes: number; comments: number; reposts: number };
  liked?: boolean;
  reposted?: boolean;
  reaction?: string | null;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: Pick<User, 'id' | 'username' | 'displayName' | 'avatar'>;
}

export interface Message {
  id: string;
  content: string;
  read: boolean;
  createdAt: string;
  senderId: string;
  sender: Pick<User, 'id' | 'username' | 'displayName' | 'avatar'>;
  receiverId?: string;
  receiver?: Pick<User, 'id' | 'username' | 'displayName' | 'avatar'>;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  avatar: string;
  createdAt: string;
  _count: { members: number; posts: number };
  isMember?: boolean;
}

export interface Story {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: string;
  expiresAt: string;
  author: Pick<User, 'id' | 'username' | 'displayName' | 'avatar'>;
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

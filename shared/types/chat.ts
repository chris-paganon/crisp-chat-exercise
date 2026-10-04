export interface ChatRoom {
  id: string;
  title: string;
  createdAt: string;
  visitorJoined: boolean;
  operatorName: string;
  inviteExpiresAt: string | null;
}

export interface ChatInvite {
  path: string;
  expiresAt: string;
}

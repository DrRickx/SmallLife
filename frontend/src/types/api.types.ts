export type User = {
  id: string;
  email?: string;
  username: string;
  role: "owner" | "sales";
};
export type Sessions = {
  user: User;
  accessToken: string;
};

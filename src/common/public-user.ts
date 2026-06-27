import { User } from '../entities/user.entity';

// Safe subset of a user to expose when returned as a relation to *other*
// users (comment authors, course instructors, enrollment students). Hides
// email and account flags; password is already select:false.
export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  role: string;
}

export function toPublicUser(user?: User | null): PublicUser | null {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    role: user.role,
  };
}

export type Mission = {
  id: string;
  title: string;
  description: string;
  points: number;
};
export type Occurrence = {
  id: string;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: number;
  status: string;
  _count?: { reservations: number };
  reservations?: Reservation[];
  proposals?: {
    room: {
      id: string;
      name: string;
      closed: boolean;
      _count: { members: number };
    };
  }[];
  experience: Experience;
};
export type Experience = {
  visibility?: "PRIVATE" | "PUBLIC";
  group?: {
    id: string;
    code?: string;
    closed?: boolean;
    _count?: { members: number };
  } | null;
  id: string;
  title: string;
  description: string;
  category: string;
  subcategoryId: string | null;
  city: string;
  itinerary: string;
  included: string;
  requirements: string;
  coverTheme: string;
  status: string;
  moderationNote: string | null;
  ownerId: string;
  owner?: { fullName: string };
  subcategory?: { name: string };
  occurrences: Occurrence[];
  missions: Mission[];
  reviews?: Review[];
  rating?: number | null;
  reviewCount?: number;
};
export type Review = {
  id: string;
  rating: number;
  comment: string;
  hidden: boolean;
  moderationNote: string | null;
  reservation: {
    user: { fullName: string };
    occurrence?: { experience: { title: string } };
  };
};
export type Reservation = {
  userId?: string;
  id: string;
  status: string;
  attended: boolean;
  user?: { fullName: string };
  occurrence: Occurrence;
  review: Review | null;
  completions: { missionId: string }[];
};
export type Room = {
  experience?: {
    id: string;
    title: string;
    description: string;
    status: string;
    visibility: "PRIVATE" | "PUBLIC";
    coverTheme: string;
  } | null;
  id: string;
  name: string;
  code: string;
  closed: boolean;
  ownerId: string;
  selectedProposalId: string | null;
  myVote: string | null;
  members: { userId: string; user: { fullName: string } }[];
  proposals: {
    id: string;
    occurrence: Occurrence;
    _count: { votes: number };
  }[];
};
export const labels: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING: "En revisión",
  PUBLISHED: "Publicada",
  REJECTED: "Rechazada",
  ARCHIVED: "Retirada",
  SCHEDULED: "Programada",
  CANCELLED: "Cancelada",
  COMPLETED: "Finalizada",
  CONFIRMED: "Confirmada",
};
export const date = (value: string) =>
  new Date(value).toLocaleString("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  });

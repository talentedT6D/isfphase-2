export interface LeaderboardEntry {
  rank: number;
  reel: number;
  title: string;
  creator: string;
  category: string;
  totalVotes: number;
  avgScore: number | null;
  videoUrl: string;
}

const VIDEO_BASE = "https://phase-2.vercel.app";

const videoUrl = (reel: number) => `${VIDEO_BASE}/?reel=${reel}`;

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, reel: 25, title: "Spoken FIlm", creator: "Rajay Naik", category: "Emotional", totalVotes: 126, avgScore: 84.7 },
  { rank: 2, reel: 8, title: "Ather Warped '25 Social Films", creator: "Studio SquarePegs", category: "AI", totalVotes: 118, avgScore: 82 },
  { rank: 3, reel: 5, title: "Vishu with my 92-year old Grandmother", creator: "Varun Manavazhi", category: "Emotional", totalVotes: 120, avgScore: 80.6 },
  { rank: 4, reel: 1, title: "Ulpathi", creator: "Yesudas Sebastian", category: "Emotional", totalVotes: 103, avgScore: 79.5 },
  { rank: 5, reel: 17, title: "The Original Thought Pandemic", creator: "Vikhyat Jain", category: "Comedy", totalVotes: 86, avgScore: 78.6 },
  { rank: 6, reel: 22, title: "Narak vlog", creator: "Priyanshu", category: "Comedy", totalVotes: 105, avgScore: 77.4 },
  { rank: 7, reel: 30, title: "Wrong Cake", creator: "Malvika Thirani", category: "Emotional", totalVotes: 116, avgScore: 76.6 },
  { rank: 8, reel: 9, title: "THE ICK", creator: "Kshitij Singh", category: "Comedy", totalVotes: 112, avgScore: 76.3 },
  { rank: 9, reel: 19, title: "HELP (yellow font)", creator: "Koushiki Malani", category: "Comedy", totalVotes: 127, avgScore: 75.5 },
  { rank: 10, reel: 34, title: "3 idiots ft. content creator", creator: "Priyanshu Sherwal", category: "Comedy", totalVotes: 119, avgScore: 75.2 },
  { rank: 11, reel: 21, title: "Breathing reminder", creator: "Avishi Khatri", category: "Edits", totalVotes: 99, avgScore: 73.9 },
  { rank: 12, reel: 18, title: "The Legends Of Underworld", creator: "Sumedh Are", category: "Comedy", totalVotes: 122, avgScore: 73.3 },
  { rank: 13, reel: 33, title: "BILLI EYELASH", creator: "pranav", category: "Comedy", totalVotes: 125, avgScore: 72.9 },
  { rank: 14, reel: 3, title: "F1: Mumbai GP", creator: "Naman Kapri", category: "Edits", totalVotes: 119, avgScore: 72.6 },
  { rank: 15, reel: 24, title: "Pansexual", creator: "Dashmeet Singh", category: "Comedy", totalVotes: 120, avgScore: 72.3 },
  { rank: 16, reel: 10, title: "Shivaji nagar reel", creator: "Irfan Nazib", category: "Food", totalVotes: 119, avgScore: 72.1 },
  { rank: 17, reel: 13, title: "Asthma Amir", creator: "Shakeel Ahmed", category: "Comedy", totalVotes: 126, avgScore: 71.5 },
  { rank: 18, reel: 20, title: "whatdoyouseeafteryoudie?", creator: "Razaid Aziz K", category: "Emotional", totalVotes: 93, avgScore: 70.9 },
  { rank: 19, reel: 2, title: "Home", creator: "Nithyashree M", category: "Emotional", totalVotes: 107, avgScore: 70.9 },
  { rank: 20, reel: 7, title: "Woh bhi sahi thi", creator: "Anurag Kerketta", category: "Comedy", totalVotes: 89, avgScore: 68.5 },
  { rank: 21, reel: 4, title: "FINDING NARA", creator: "Jayanth Somashekar", category: "AI", totalVotes: 114, avgScore: 68.4 },
  { rank: 22, reel: 29, title: "The Hardest Thing", creator: "Ritesh Varna", category: "Emotional", totalVotes: 117, avgScore: 68.4 },
  { rank: 23, reel: 14, title: "Alive", creator: "Ritesh Varna", category: "Edits", totalVotes: 123, avgScore: 68.2 },
  { rank: 24, reel: 31, title: "What are you feeling right now?", creator: "Aaliya", category: "Edits", totalVotes: 118, avgScore: 67.8 },
  { rank: 25, reel: 27, title: "Comedy - Self care", creator: "Akash N", category: "Comedy", totalVotes: 93, avgScore: 67.8 },
  { rank: 26, reel: 16, title: "PS5 - A Dream", creator: "Yash Kapoor", category: "Emotional", totalVotes: 119, avgScore: 66.1 },
  { rank: 27, reel: 15, title: "evil janardan", creator: "sahil", category: "Edits", totalVotes: 123, avgScore: 65.6 },
  { rank: 28, reel: 23, title: "The Voicemail", creator: "Varun Nagesh", category: "Emotional", totalVotes: 112, avgScore: 64 },
  { rank: 29, reel: 28, title: "Embracing New Cultures", creator: "Kesang Bhutia", category: "Comedy", totalVotes: 112, avgScore: 63.3 },
  { rank: 30, reel: 32, title: "Dhobi Ghat", creator: "Rajay Naik", category: "Emotional", totalVotes: 120, avgScore: 60.8 },
  { rank: 31, reel: 11, title: "Megha's birthday!", creator: "Raksha Jaju", category: "Emotional", totalVotes: 127, avgScore: 60.3 },
  { rank: 32, reel: 6, title: "Inglourious Cokesters", creator: "Jatin", category: "Comedy", totalVotes: 74, avgScore: 56.9 },
  { rank: 33, reel: 26, title: "Vijay Mallya vs SBI", creator: "Zubin Zaheer", category: "Comedy", totalVotes: 115, avgScore: 55.9 },
  { rank: 34, reel: 12, title: "Ram Kewal ki Chai - Lucknow", creator: "Kushagra Tiwari", category: "Food", totalVotes: 0, avgScore: null },
].map((e) => ({ ...e, videoUrl: videoUrl(e.reel) }));

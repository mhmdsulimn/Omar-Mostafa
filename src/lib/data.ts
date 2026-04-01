
export type Exam = {
  id: string;
  title: string;
  description: string;
  duration: number; 
  grade: 'first_secondary' | 'second_secondary' | 'third_secondary';
  allowRetakes: boolean;
  questionCount?: number;
  isPrivate?: boolean;
  rewardThreshold?: number;
  rewardAmount?: number;
};

export type Question = {
  id: string;
  examId: string;
  text: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctAnswer: string;
  points: number;
  imageUrl?: string;
};

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  grade: 'first_secondary' | 'second_secondary' | 'third_secondary';
  photoURL?: string; 
  isBanned?: boolean;
  balance: number;
  theme?: {
    primaryColor: string; 
  };
  rewardedExams?: string[];
  fcmTokens?: string[];
  currentSessionId?: string;
  readAnnouncements?: string[];
  deletedAnnouncements?: string[];
  lastActiveAt?: string; // تاريخ آخر ظهور للطالب
};

export type CurriculumUnit = {
  id: number;
  title: string;
  grammar: string;
  writing: string;
};

export type Curriculum = {
  id: string; // Grade ID
  gradeTitle: string;
  story: string;
  units: CurriculumUnit[];
  lastUpdated: string;
};

export type StudentExam = {
  id: string;
  studentId: string;
  examId: string;
  score: number;
  achievedPoints: number;
  totalPoints: number;
  submissionDate: string;
  answers: Record<string, string>;
  questions: Question[];
  rewardAwarded?: number;
  timeTaken?: number;
};

export type Announcement = {
    id: string;
    message: string;
    isActive: boolean;
    updatedAt: string;
    targetGrade: 'all' | 'first_secondary' | 'second_secondary' | 'third_secondary';
    type?: 'normal' | 'congratulation' | 'warning';
}

export type Course = {
  id: string;
  title: string;
  description: string;
  grade: 'first_secondary' | 'second_secondary' | 'third_secondary';
  thumbnailUrl?: string;
  price: number;
  discountPrice?: number;
  isPublished: boolean;
  createdAt: string;
}

export type StudentCourse = {
    id: string;
    studentId: string;
    courseId: string;
    purchaseDate: string;
    pricePaid: number;
}

export type Lecture = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
};

export type LectureContent = {
  id: string;
  lectureId: string;
  title: string;
  type: 'video' | 'pdf' | 'quiz' | 'assignment' | 'link';
  order: number;
  videoUrl?: string;
  pdfUrl?: string;
  linkedExamId?: string;
  externalUrl?: string;
};

export type StudentContentProgress = {
  id: string;
  status: 'completed';
  completedAt: string;
};

export type DepositRequest = {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  approvedAmount?: number;
  senderPhoneNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  reviewDate?: string;
  reviewerId?: string;
  reviewerNotes?: string;
};

export type AppSettings = {
  isMaintenanceMode: boolean;
  isLeaderboardEnabled?: boolean;
  supportPhoneNumber?: string;
  vodafoneCashNumber?: string;
  imgbbApiKey?: string;
};

export type Notification = {
  id: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type: 'wallet' | 'announcement' | 'general' | 'reward' | 'congratulation' | 'warning' | 'normal';
  link?: string;
  fromAdmin?: boolean;
  studentName?: string;
};

export type LabExperiment = {
  id: string;
  title: string;
  description: string;
  embedUrl: string;
  grade: 'all' | 'first_secondary' | 'second_secondary' | 'third_secondary';
  createdAt: string;
};

export type Sex = '男' | '女';

export interface FourPillars {
  year: string;
  month: string;
  day: string;
  hour: string;
}

export interface Branch4Course {
  upperGod: string;
  upper: string;
  lower: string;
}

export interface ThreePassages {
  first: { branch: string; god?: string };
  middle: { branch: string; god?: string };
  last: { branch: string; god?: string };
}

export interface CourseChart {
  pillars: FourPillars;
  monthGeneral: string;
  hourBranch: string;
  sex: Sex;

  course: {
    one: Branch4Course;
    two: Branch4Course;
    three: Branch4Course;
    four: Branch4Course;
  };
  passages: ThreePassages;

  noblePalace: string;

  question: string;

  natalYear?: string;
  currentYear?: string;
  voidPalaces?: string;
  notes?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequestBody {
  chart: CourseChart | null;
  history: ChatMessage[];
  userMessage: string;
}

export interface ChatResponseBody {
  assistant: string;
}

// 已提交课盘的历史记录条目，用于刷新后快速复用
export interface SavedChart {
  id: string;
  savedAt: number;
  chart: CourseChart;
}

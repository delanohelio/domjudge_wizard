// Tipos e contratos de dados para o ecossistema DOMjudge

export interface Contest {
  id: string;
  cid?: string;
  name: string;
  formal_name?: string;
  shortname?: string;
  start_time: string | null;
  end_time: string | null;
  duration?: string;
  scoreboard_freeze_duration?: string | null;
  enabled: boolean;
  public?: boolean;
  // Campos locais para tracking de alterações
  _original?: {
    start_time: string | null;
    end_time: string | null;
    enabled: boolean;
  };
  _changed?: boolean;
}

export interface Problem {
  id: string;
  label?: string;
  name: string;
  short_name?: string;
  time_limit?: number;
  memory_limit?: number;
  ordinal?: number;
  rgb?: string;
  color?: string;
}

export interface Submission {
  id: string;
  contest_id: string;
  team_id: string;
  problem_id: string;
  language_id: string;
  time: string;
  contest_time?: string;
  entry_point?: string | null;
  files?: Array<{ href: string; mime: string }>;
  // Campos enriquecidos pelo cliente
  judgement?: Judgement;
  judgementType?: string; // 'AC', 'WA', 'TLE', 'RTE', 'CE', 'PENDING'
  sourceCode?: string;
  sourceFilename?: string;
}

export interface Judgement {
  id: string;
  submission_id: string;
  judgement_type_id: string | null;
  valid: boolean;
  start_time: string;
  end_time?: string;
  max_run_time?: number;
}

export interface Team {
  id: string;
  name: string;
  display_name?: string;
  category_id?: string;
  organization_id?: string | null;
  affiliation?: string;
  members?: string;
}

export interface TeamCategory {
  id: string;
  name: string;
  sortorder?: number;
  color?: string;
  visible?: boolean;
}

export interface UserAccount {
  id?: string;
  username: string;
  name?: string;
  email?: string | null;
  team_id?: string | null;
  roles: string[];
  enabled?: boolean;
  password?: string;
  category_id?: string;
  labels?: string[];
  // Campos locais de rastreamento
  _original?: {
    name?: string;
    email?: string | null;
    team_id?: string | null;
    roles: string[];
    enabled?: boolean;
    category_id?: string;
  };
  _changed?: boolean;
  _conflict?: boolean;
  _conflictReason?: string;
}

export interface TestCase {
  id: string;
  type: "sample" | "secret";
  input: string;
  output: string;
  description?: string;
}

export interface ApiCredentials {
  apiBase: string;
  user: string;
  password?: string;
  isAuthenticated: boolean;
  isDemo?: boolean;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
}

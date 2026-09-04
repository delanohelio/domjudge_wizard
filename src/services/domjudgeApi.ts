import {
  Contest,
  Problem,
  Submission,
  Team,
  TeamCategory,
  UserAccount,
  ApiCredentials,
} from "@/types/domjudge";

export class DomjudgeApiService {
  private creds: ApiCredentials;

  constructor(creds: ApiCredentials) {
    this.creds = creds;
  }

  private getAuthHeader(): string {
    return `Basic ${btoa(`${this.creds.user}:${this.creds.password || ""}`)}`;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (this.creds.isDemo) {
      return this.handleDemoRequest<T>(path, options);
    }

    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${this.creds.apiBase}${cleanPath}`;
    const headers = {
      Authorization: this.getAuthHeader(),
      Accept: "application/json",
      ...options.headers,
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Erro na API (${res.status}): ${errText || res.statusText}`);
    }
    return res.json();
  }

  // 1. Contests
  async getContests(): Promise<Contest[]> {
    return this.request<Contest[]>("/contests");
  }

  async patchContest(contestId: string, data: { start_time?: string | null; end_time?: string | null; enabled?: boolean }): Promise<any> {
    if (this.creds.isDemo) {
      return { success: true, contestId, ...data };
    }
    const cleanPath = `/contests/${encodeURIComponent(contestId)}`;
    return this.request(cleanPath, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  // 2. Problems
  async getProblems(contestId: string): Promise<Problem[]> {
    return this.request<Problem[]>(`/contests/${encodeURIComponent(contestId)}/problems`);
  }

  // 3. Submissions
  async getSubmissions(contestId: string): Promise<Submission[]> {
    return this.request<Submission[]>(`/contests/${encodeURIComponent(contestId)}/submissions`);
  }

  // 4. Judgements
  async getJudgements(contestId: string): Promise<any[]> {
    return this.request<any[]>(`/contests/${encodeURIComponent(contestId)}/judgements`);
  }

  // 5. Teams
  async getTeams(contestId: string): Promise<Team[]> {
    return this.request<Team[]>(`/contests/${encodeURIComponent(contestId)}/teams`);
  }

  // 6. Categories
  async getCategories(): Promise<TeamCategory[]> {
    try {
      return await this.request<TeamCategory[]>("/categories");
    } catch {
      try {
        return await this.request<TeamCategory[]>("/teams/categories");
      } catch {
        return [];
      }
    }
  }

  // 7. Users
  async getUsers(): Promise<UserAccount[]> {
    return this.request<UserAccount[]>("/users");
  }

  // 8. Source Code
  async getSourceCode(contestId: string, submissionId: string): Promise<{ filename: string; source: string }[]> {
    if (this.creds.isDemo) {
      return [
        {
          filename: "solution.cpp",
          source: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    if (cin >> a >> b) {\n        cout << a + b << "\\n";\n    }\n    return 0;\n}\n`,
        },
      ];
    }
    return this.request<{ filename: string; source: string }[]>(
      `/contests/${encodeURIComponent(contestId)}/submissions/${encodeURIComponent(submissionId)}/source-code`
    );
  }

  // 9. Sync Accounts (Bulk save)
  async syncAccounts(accounts: any[]): Promise<any> {
    if (this.creds.isDemo) {
      return { success: true, count: accounts.length };
    }

    const url = `${this.creds.apiBase}/users/accounts`;
    const fd = new FormData();
    const jsonBlob = new Blob([JSON.stringify(accounts)], { type: "application/json" });
    fd.append("json", jsonBlob, "accounts.json");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.getAuthHeader(),
      },
      body: fd,
    });

    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      throw new Error(`Falha ao sincronizar contas (${res.status}): ${errTxt}`);
    }
    return res.json().catch(() => ({ success: true }));
  }

  // 10. Upload Problem Zip
  async uploadProblemZip(contestId: string, zipBlob: Blob): Promise<any> {
    if (this.creds.isDemo) {
      return { success: true, problem_id: "demo-prob-1" };
    }

    const url = `${this.creds.apiBase}/contests/${encodeURIComponent(contestId)}/problems`;
    const fd = new FormData();
    fd.append("zip", zipBlob, "problem.zip");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.getAuthHeader(),
      },
      body: fd,
    });

    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      throw new Error(`Falha no upload do problema (${res.status}): ${errTxt}`);
    }
    return res.json().catch(() => ({ success: true }));
  }

  // Mock Demo Handler
  private handleDemoRequest<T>(path: string, options: RequestInit): T {
    if (path === "/contests") {
      return [
        {
          id: "demo-contest-1",
          name: "Maratona Fase Zero 2026",
          formal_name: "Maratona de Programação Fase Zero 2026",
          shortname: "fase0-2026",
          start_time: new Date(Date.now() - 3600000).toISOString(),
          end_time: new Date(Date.now() + 14400000).toISOString(),
          enabled: true,
        },
        {
          id: "demo-contest-2",
          name: "Treino Semanal 01",
          formal_name: "Aquecimento Geral",
          shortname: "treino-01",
          start_time: new Date(Date.now() + 86400000).toISOString(),
          end_time: new Date(Date.now() + 90000000).toISOString(),
          enabled: false,
        },
      ] as unknown as T;
    }

    if (path.includes("/problems")) {
      return [
        { id: "prob-a", label: "A", name: "Soma de Elementos", time_limit: 1.0, memory_limit: 262144, color: "#4f46e5" },
        { id: "prob-b", label: "B", name: "Caminho Mínimo no Grafo", time_limit: 2.0, memory_limit: 524288, color: "#10b981" },
        { id: "prob-c", label: "C", name: "Palíndromo Máximo", time_limit: 1.5, memory_limit: 262144, color: "#f59e0b" },
      ] as unknown as T;
    }

    if (path.includes("/teams")) {
      return [
        { id: "team-1", name: "BitBusters", display_name: "BitBusters (UFPE)", category_id: "cat-1" },
        { id: "team-2", name: "CodeKnights", display_name: "CodeKnights (USP)", category_id: "cat-1" },
        { id: "team-3", name: "NullPointers", display_name: "NullPointers (Unicamp)", category_id: "cat-2" },
      ] as unknown as T;
    }

    if (path.includes("/submissions")) {
      return [
        {
          id: "sub-1",
          contest_id: "demo-contest-1",
          team_id: "team-1",
          problem_id: "prob-a",
          language_id: "cpp",
          time: new Date(Date.now() - 1800000).toISOString(),
          judgementType: "AC",
        },
        {
          id: "sub-2",
          contest_id: "demo-contest-1",
          team_id: "team-2",
          problem_id: "prob-a",
          language_id: "cpp",
          time: new Date(Date.now() - 1200000).toISOString(),
          judgementType: "WA",
        },
        {
          id: "sub-3",
          contest_id: "demo-contest-1",
          team_id: "team-3",
          problem_id: "prob-b",
          language_id: "py3",
          time: new Date(Date.now() - 600000).toISOString(),
          judgementType: "TLE",
        },
      ] as unknown as T;
    }

    if (path.includes("/judgements")) {
      return [
        { id: "j-1", submission_id: "sub-1", judgement_type_id: "AC", valid: true },
        { id: "j-2", submission_id: "sub-2", judgement_type_id: "WA", valid: true },
        { id: "j-3", submission_id: "sub-3", judgement_type_id: "TLE", valid: true },
      ] as unknown as T;
    }

    if (path === "/users") {
      return [
        { id: "u-1", username: "admin", name: "Administrador Geral", email: "admin@maratona.org", roles: ["admin"], enabled: true },
        { id: "u-2", username: "jury1", name: "Jurado Chefe", email: "jury@maratona.org", roles: ["jury"], enabled: true },
        { id: "u-3", username: "team1", name: "BitBusters", email: "team1@maratona.org", team_id: "team-1", roles: ["team"], enabled: true },
        { id: "u-4", username: "team2", name: "CodeKnights", email: "team2@maratona.org", team_id: "team-2", roles: ["team"], enabled: false },
      ] as unknown as T;
    }

    if (path.includes("/categories")) {
      return [
        { id: "cat-1", name: "Oficial ICPC", sortorder: 1, color: "#6366f1" },
        { id: "cat-2", name: "Café com Leite", sortorder: 2, color: "#10b981" },
      ] as unknown as T;
    }

    return [] as unknown as T;
  }
}

import axios, { type AxiosResponse } from 'axios';

// Types
export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  html_url: string;
  language?: string;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
}

export interface User {
  login: string;
  name?: string;
  avatar_url: string;
  bio?: string;
  public_repos: number;
  followers: number;
  following: number;
}

export interface ReadmeResponse {
  readme_content: string;
  repo_analysis: {
    name: string;
    description: string;
    language: string;
    languages: Record<string, number>;
    dependencies: string[];
    main_files: string[];
    structure: string[];
  };
}

export interface CommitResponse {
  success: boolean;
  message: string;
  commit_sha: string;
  commit_url: string;
  file_url: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('github_token');
    
    // Set up axios interceptors for authentication
    axios.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for handling auth errors
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('github_token', token);
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('github_token');
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem('github_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // API endpoints
  async login(code: string): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<LoginResponse> = await axios.post(
        `${this.baseURL}/auth/github`,
        { code }
      );
      
      this.setToken(response.data.access_token);
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Failed to authenticate with GitHub');
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response: AxiosResponse<User> = await axios.get(
        `${this.baseURL}/user`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw new Error('Failed to fetch user information');
    }
  }

  async getRepositories(): Promise<Repository[]> {
    try {
      const response: AxiosResponse<Repository[]> = await axios.get(
        `${this.baseURL}/repos`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get repositories:', error);
      throw new Error('Failed to fetch repositories');
    }
  }

  async generateReadme(repoName: string, fullName: string): Promise<ReadmeResponse> {
    try {
      const response: AxiosResponse<ReadmeResponse> = await axios.post(
        `${this.baseURL}/generate-readme`,
        {
          repo_name: repoName,
          full_name: fullName,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to generate README:', error);
      throw new Error('Failed to generate README');
    }
  }

  async commitReadmeToRepo(
    repoName: string, 
    fullName: string, 
    readmeContent: string, 
    commitMessage?: string
  ): Promise<CommitResponse> {
    try {
      const response: AxiosResponse<CommitResponse> = await axios.post(
        `${this.baseURL}/commit-readme`,
        {
          repo_name: repoName,
          full_name: fullName,
          readme_content: readmeContent,
          commit_message: commitMessage || "📝 Add AI-generated README.md"
        }
      );
      return response.data;
    } catch {
      console.error('Failed to commit README');
      throw new Error('Failed to commit README to repository');
    }
  }

  // GitHub OAuth URL generator
  getGitHubOAuthUrl(): string {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
    const scope = encodeURIComponent('repo read:user');
    
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
  }

  // Utility method for downloading README
  downloadReadme(content: string, fileName: string = 'README.md'): void {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Utility method for copying to clipboard
  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
  }
}

// Export a singleton instance
export const apiService = new ApiService();
export default apiService;
